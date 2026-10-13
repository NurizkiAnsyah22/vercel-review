import { nanoid } from "nanoid";
import type { CardStatus, Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import type { ListCardsQuery } from "../validation/card";
import { generateUniqueActivationCodes } from "./activation-code";

const CODE_PREFIX = "CARD-";
const CODE_PAD = 6;
const CODE_COUNTER_KEY = "card_code";
const MAX_BATCH = 500;

/**
 * Public token used in the card URL. nanoid's default alphabet has 64 symbols
 * (= 6 bits per char), so 16 chars => 96 bits of entropy (unguessable).
 */
function generatePublicToken(): string {
  return nanoid(16);
}

function padCode(value: number): string {
  return `${CODE_PREFIX}${String(value).padStart(CODE_PAD, "0")}`;
}

/**
 * Atomically reserves a contiguous block of card codes via the `Counter` row
 * and inserts the cards. Safe under concurrent calls (row-level lock on upsert).
 */
export async function generateCards(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    throw new Error(`count must be an integer between 1 and ${MAX_BATCH}`);
  }

  return prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where: { key: CODE_COUNTER_KEY },
      create: { key: CODE_COUNTER_KEY, value: count },
      update: { value: { increment: count } },
    });

    const endValue = counter.value;
    const startValue = endValue - count + 1;

    // Every card gets its OWN unique, opaque Kode Aktivasi. The QR MASTER stays
    // a single shared QR for the whole batch (see buildActivationEntryUrl).
    const activationCodes = await generateUniqueActivationCodes(count, tx);

    // QR assets are rendered on demand from the immutable public token, so the
    // card is printable the moment it is created (mark it ready immediately).
    const qrGeneratedAt = new Date();

    const data: Prisma.CardCreateManyInput[] = [];
    for (let value = startValue; value <= endValue; value += 1) {
      data.push({
        code: padCode(value),
        publicToken: generatePublicToken(),
        activationCode: activationCodes[value - startValue],
        qrGeneratedAt,
      });
    }

    await tx.card.createMany({ data });

    return tx.card.findMany({
      where: { code: { in: data.map((item) => item.code) } },
      orderBy: { code: "asc" },
    });
  });
}

export type CardInteractionCounts = { QR: number; NFC: number; total: number };

/** Interaction counts per card (QR / NFC / total) for a set of card ids. */
export async function getInteractionCounts(
  cardIds: string[],
): Promise<Map<string, CardInteractionCounts>> {
  const result = new Map<string, CardInteractionCounts>();
  if (cardIds.length === 0) return result;

  const grouped = await prisma.interaction.groupBy({
    by: ["cardId", "source"],
    where: { cardId: { in: cardIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = result.get(row.cardId) ?? { QR: 0, NFC: 0, total: 0 };
    const count = row._count._all;
    if (row.source === "QR") entry.QR = count;
    else if (row.source === "NFC") entry.NFC = count;
    entry.total += count;
    result.set(row.cardId, entry);
  }

  return result;
}

export async function listCards(query: ListCardsQuery) {
  const { status, orderStatus, q, page, pageSize } = query;

  const where: Prisma.CardWhereInput = {};
  if (status) where.status = status;
  if (orderStatus) where.order = { status: orderStatus };
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { activationCode: { contains: q, mode: "insensitive" } },
      { publicToken: { contains: q, mode: "insensitive" } },
      { business: { name: { contains: q, mode: "insensitive" } } },
      { business: { whatsappNumber: { contains: q } } },
      { order: { buyerWhatsappNumber: { contains: q } } },
      { order: { buyerName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        business: { select: { id: true, name: true, whatsappNumber: true } },
        order: {
          select: { id: true, status: true, buyerWhatsappNumber: true, buyerName: true },
        },
      },
    }),
  ]);

  const counts = await getInteractionCounts(rows.map((row) => row.id));
  const items = rows.map((row) => ({
    ...row,
    interactionCounts: counts.get(row.id) ?? { QR: 0, NFC: 0, total: 0 },
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCardById(id: string) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      business: true,
      order: true,
      assignments: { orderBy: { assignedAt: "desc" }, take: 20 },
      interactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!card) return null;

  const [grouped, lastInteraction, lastNotification] = await Promise.all([
    prisma.interaction.groupBy({
      by: ["source"],
      where: { cardId: id },
      _count: { _all: true },
    }),
    prisma.interaction.findFirst({ where: { cardId: id }, orderBy: { createdAt: "desc" } }),
    card.businessId
      ? prisma.notification.findFirst({
          where: { businessId: card.businessId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const interactionCounts: CardInteractionCounts = { QR: 0, NFC: 0, total: 0 };
  for (const row of grouped) {
    const count = row._count._all;
    if (row.source === "QR") interactionCounts.QR = count;
    else if (row.source === "NFC") interactionCounts.NFC = count;
    interactionCounts.total += count;
  }

  return { ...card, interactionCounts, lastInteraction, lastNotification };
}

export function countByStatus(status: CardStatus) {
  return prisma.card.count({ where: { status } });
}
