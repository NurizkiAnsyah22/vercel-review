import type { CardStatus } from "@prisma/client";
import { buildPublicCardUrl } from "../../lib/public-url";
import { prisma } from "../db/client";

/**
 * Printing/production data for the physical cards.
 *
 * Product model: EVERY card has its OWN unique QR sticker whose payload is
 * `{PUBLIC_APP_URL}/r/{publicToken}`. The same QR is dual-purpose:
 *   - card UNACTIVATED -> opens the activation form for that exact card
 *   - card ACTIVE      -> 302 to that card's Google Review URL
 *
 * QR images are rendered on demand by /api/qr/{token}, so the print sheet never
 * depends on persisted files (which Vercel Functions cannot provide).
 */

export type PrintableCard = {
  id: string;
  code: string;
  activationCode: string | null;
  publicToken: string;
  status: CardStatus;
  qrUrl: string;
  nfcUrl: string;
  qrReady: boolean;
  qrError: string | null;
};

/** Payload printed inside the QR sticker of a card. */
export function cardQrUrl(publicToken: string): string {
  return buildPublicCardUrl(publicToken);
}

/** Payload written to the NFC tag of a card (same target as the QR). */
export function cardNfcUrl(publicToken: string): string {
  return buildPublicCardUrl(publicToken, "nfc");
}

export type ListPrintableCardsOptions = {
  statuses?: CardStatus[];
  limit?: number;
  search?: string;
};

/**
 * Cards ready to be printed with their unique QR payload. The QR is generated
 * on demand, so every card is always printable.
 */
export async function listPrintableCards(
  options: ListPrintableCardsOptions = {},
): Promise<PrintableCard[]> {
  const { statuses, limit, search } = options;

  const cards = await prisma.card.findMany({
    where: {
      ...(statuses && statuses.length > 0 ? { status: { in: statuses } } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { activationCode: { contains: search, mode: "insensitive" as const } },
              { publicToken: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { code: "asc" },
    ...(limit && limit > 0 ? { take: limit } : {}),
    select: {
      id: true,
      code: true,
      activationCode: true,
      publicToken: true,
      status: true,
      qrError: true,
    },
  });

  return cards.map((card) => ({
    id: card.id,
    code: card.code,
    activationCode: card.activationCode,
    publicToken: card.publicToken,
    status: card.status,
    qrUrl: cardQrUrl(card.publicToken),
    nfcUrl: cardNfcUrl(card.publicToken),
    qrReady: true,
    qrError: card.qrError,
  }));
}
