import { prisma } from "../db/client";
import { logger } from "../../lib/logger";
import { buildGoogleReviewUrl, resolvePlaceFromMapsUrl } from "./places";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function suspendCard(cardId: string): Promise<ActionResult> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };
  if (card.status !== "ACTIVE") return { ok: false, message: "Hanya kartu ACTIVE yang bisa di-suspend" };

  await prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: card.id },
      data: { status: "SUSPENDED", suspendedAt: new Date() },
    });
    if (card.businessId) {
      await tx.cardAssignment.create({
        data: { cardId: card.id, businessId: card.businessId, action: "SUSPENDED", note: "admin suspend" },
      });
    }
  });

  return { ok: true, message: "Kartu berhasil di-suspend" };
}

export async function reactivateCard(cardId: string): Promise<ActionResult> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };
  if (card.status !== "SUSPENDED") return { ok: false, message: "Hanya kartu SUSPENDED yang bisa diaktifkan kembali" };
  if (!card.businessId) return { ok: false, message: "Kartu belum terhubung ke bisnis" };

  const businessId = card.businessId;
  await prisma.$transaction(async (tx) => {
    await tx.card.update({ where: { id: card.id }, data: { status: "ACTIVE", suspendedAt: null } });
    await tx.cardAssignment.create({
      data: { cardId: card.id, businessId, action: "REACTIVATED", note: "admin reactivate" },
    });
  });

  return { ok: true, message: "Kartu diaktifkan kembali" };
}

export async function resetCard(cardId: string, note = "admin reset"): Promise<ActionResult> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };

  const previousBusinessId = card.businessId;

  await prisma.$transaction(async (tx) => {
    if (previousBusinessId) {
      await tx.cardAssignment.create({
        data: { cardId: card.id, businessId: previousBusinessId, action: "RESET", note },
      });
    }
    await tx.card.update({
      where: { id: card.id },
      data: { status: "UNACTIVATED", businessId: null, activatedAt: null, suspendedAt: null },
    });
  });

  return { ok: true, message: "Kartu di-reset ke UNACTIVATED" };
}

export async function reassignCard(cardId: string, businessId: string): Promise<ActionResult> {
  const [card, business] = await Promise.all([
    prisma.card.findUnique({ where: { id: cardId } }),
    prisma.business.findUnique({ where: { id: businessId } }),
  ]);

  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };
  if (!business) return { ok: false, message: "Bisnis tidak ditemukan" };
  if (!business.googleReviewUrl) return { ok: false, message: "Bisnis tujuan belum punya Google Review URL" };

  const previousBusinessId = card.businessId;

  await prisma.$transaction(async (tx) => {
    if (previousBusinessId && previousBusinessId !== businessId) {
      await tx.cardAssignment.create({
        data: { cardId: card.id, businessId: previousBusinessId, action: "RESET", note: "reassign: unlink" },
      });
    }
    await tx.card.update({
      where: { id: card.id },
      data: { status: "ACTIVE", businessId, activatedAt: new Date(), suspendedAt: null, qrGeneratedAt: new Date(), qrError: null },
    });
    await tx.cardAssignment.create({
      data: { cardId: card.id, businessId, action: "REASSIGNED", note: "admin reassign" },
    });
  });

  return { ok: true, message: "Kartu berhasil dipindahkan ke bisnis tujuan" };
}

export async function resolvePendingCard(cardId: string): Promise<ActionResult> {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { business: true } });
  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };
  if (card.status !== "PENDING") return { ok: false, message: "Kartu bukan dalam status PENDING" };
  if (!card.business?.googleMapsUrl) return { ok: false, message: "Bisnis belum menyimpan Google Maps URL" };

  const businessId = card.businessId as string;

  try {
    const place = await resolvePlaceFromMapsUrl(card.business.googleMapsUrl);
    const reviewUrl = buildGoogleReviewUrl(place.placeId);

    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: {
          placeId: place.placeId,
          googleReviewUrl: reviewUrl,
          googleRating: place.rating ?? null,
          googleReviewCount: place.reviewCount ?? null,
          lastKnownReviewCount: place.reviewCount ?? null,
          status: "ACTIVE",
        },
      });
      await tx.card.update({
        where: { id: card.id },
        data: { status: "ACTIVE", activatedAt: new Date(), qrGeneratedAt: new Date(), qrError: null },
      });
      await tx.cardAssignment.create({
        data: { cardId: card.id, businessId, action: "ACTIVATED", note: "admin resolve" },
      });
    });

    await prisma.order.updateMany({
      where: { cardId: card.id, status: { not: "CANCELLED" } },
      data: { status: "READY_TO_PRINT" },
    });

    return { ok: true, message: "Place ID di-resolve. Kartu aktif & QR siap (READY_TO_PRINT)." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Resolve pending card failed", { cardId, message });
    return { ok: false, message: `Gagal resolve: ${message}` };
  }
}

/**
 * Admin retry/regenerate action for the card QR assets.
 *
 * QR images are rendered on demand from the immutable public token, so this
 * simply re-marks the card as QR-ready and moves the production status forward.
 */
export async function generateQrForCard(cardId: string): Promise<ActionResult> {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { business: true } });
  if (!card) return { ok: false, message: "Kartu tidak ditemukan" };
  if (card.status !== "ACTIVE") return { ok: false, message: "Kartu belum ACTIVE" };
  if (!card.business?.googleReviewUrl) {
    return { ok: false, message: "Google Review URL belum tersedia — QR tidak boleh dibuat" };
  }

  await prisma.card.update({
    where: { id: card.id },
    data: { qrGeneratedAt: new Date(), qrError: null },
  });

  await prisma.order.updateMany({
    where: { cardId: card.id, status: { not: "CANCELLED" } },
    data: { status: "READY_TO_PRINT" },
  });

  return { ok: true, message: "QR berhasil dibuat. Status produksi: READY_TO_PRINT" };
}

export async function getOverview() {
  const [total, active, unactivated, pending, suspended, qr, nfc, totalInteractions, recentInteractions, notificationsSent] =
    await Promise.all([
      prisma.card.count(),
      prisma.card.count({ where: { status: "ACTIVE" } }),
      prisma.card.count({ where: { status: "UNACTIVATED" } }),
      prisma.card.count({ where: { status: "PENDING" } }),
      prisma.card.count({ where: { status: "SUSPENDED" } }),
      prisma.interaction.count({ where: { source: "QR" } }),
      prisma.interaction.count({ where: { source: "NFC" } }),
      prisma.interaction.count(),
      prisma.interaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { card: { select: { code: true } }, business: { select: { name: true } } },
      }),
      prisma.notification.count({ where: { status: "SENT" } }),
    ]);

  return {
    cards: { total, active, unactivated, pending, suspended },
    interactions: { total: totalInteractions, qr, nfc },
    notificationsSent,
    recentInteractions,
  };
}
