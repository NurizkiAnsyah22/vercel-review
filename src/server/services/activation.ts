import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { logger } from "../../lib/logger";
import {
  PlacesResolutionError,
  buildGoogleReviewUrl,
  resolvePlaceFromMapsUrl,
  type ResolvedPlace,
} from "./places";
import { normalizeActivationCode } from "./activation-code";

export type ActivationInput = {
  /** Personalized per-card token (NFC / per-card QR flow). */
  token?: string;
  /** Printed Kode Aktivasi (QR MASTER flow). Exactly one of token/code. */
  activationCode?: string;
  storeName: string;
  whatsappNumber: string;
  mapsUrl: string;
};

export type ActivationResult =
  | { status: "activated"; cardCode: string; reviewUrl: string; qr: "READY" | "FAILED"; qrError?: string }
  | { status: "pending"; cardCode: string; reason: string }
  | { status: "already_active"; cardCode: string; reviewUrl: string | null }
  | { status: "suspended"; cardCode: string }
  | { status: "not_found" };

/**
 * Activates a card.
 * - UNACTIVATED/PENDING + successful place resolution -> ACTIVE
 * - UNACTIVATED/PENDING + failed resolution  -> PENDING (manual review needed)
 * - ACTIVE -> no-op ; SUSPENDED -> rejected
 */
export async function activateCard(input: ActivationInput): Promise<ActivationResult> {
  const card = await findActivationTarget(input);
  if (!card) return { status: "not_found" };

  // Idempotent + no takeover: an ACTIVE card can never be re-assigned through
  // its activation code, and a SUSPENDED card can never be activated.
  if (card.status === "ACTIVE") {
    return {
      status: "already_active",
      cardCode: card.code,
      reviewUrl: card.business?.googleReviewUrl ?? null,
    };
  }
  if (card.status === "SUSPENDED") return { status: "suspended", cardCode: card.code };

  let resolvedPlace: ResolvedPlace | null = null;
  let failureReason = "unknown";

  try {
    resolvedPlace = await resolvePlaceFromMapsUrl(input.mapsUrl);
  } catch (error) {
    failureReason = error instanceof PlacesResolutionError ? error.code : "unknown";
    logger.warn("Activation: place resolution failed", { cardId: card.id, reason: failureReason });
  }

  const existingBusinessId = card.businessId;

  if (!resolvedPlace) {
    await prisma.$transaction(async (tx) => {
      const businessId = await upsertBusinessForPending(tx, existingBusinessId, input);
      await tx.card.update({
        where: { id: card.id },
        data: { businessId, status: "PENDING" },
      });
      await tx.cardAssignment.create({
        data: {
          cardId: card.id,
          businessId,
          action: "ACTIVATED",
          note: `auto: pending verification (${failureReason})`,
        },
      });
    });

    return { status: "pending", cardCode: card.code, reason: failureReason };
  }

  const place = resolvedPlace;
  const reviewUrl = buildGoogleReviewUrl(place.placeId);

  await prisma.$transaction(async (tx) => {
    const businessId = await upsertBusinessForActive(tx, existingBusinessId, input, place, reviewUrl);
    await tx.card.update({
      where: { id: card.id },
      data: { businessId, status: "ACTIVE", activatedAt: new Date(), suspendedAt: null },
    });
    await tx.cardAssignment.create({
      data: { cardId: card.id, businessId, action: "ACTIVATED" },
    });
  });

  // QR assets are generated on demand from the immutable public token, so the
  // card is immediately printable — mark it ready (nothing is persisted on disk).
  await prisma.card.update({
    where: { id: card.id },
    data: { qrGeneratedAt: new Date(), qrError: null },
  });

  return { status: "activated", cardCode: card.code, reviewUrl, qr: "READY" };
}

/**
 * Resolves the card to activate: by Kode Aktivasi (QR MASTER) when provided,
 * otherwise by the personalized public token. The printed Card ID alone can
 * never activate a card.
 */
async function findActivationTarget(input: ActivationInput) {
  if (input.activationCode) {
    return prisma.card.findUnique({
      where: { activationCode: normalizeActivationCode(input.activationCode) },
      include: { business: { select: { googleReviewUrl: true } } },
    });
  }
  if (input.token) {
    return prisma.card.findUnique({
      where: { publicToken: input.token },
      include: { business: { select: { googleReviewUrl: true } } },
    });
  }
  return null;
}

type Tx = Prisma.TransactionClient;

async function upsertBusinessForPending(
  tx: Tx,
  existingBusinessId: string | null,
  input: ActivationInput,
): Promise<string> {
  if (existingBusinessId) {
    const updated = await tx.business.update({
      where: { id: existingBusinessId },
      data: {
        name: input.storeName,
        whatsappNumber: input.whatsappNumber,
        googleMapsUrl: input.mapsUrl,
        status: "PENDING_VERIFICATION",
      },
    });
    return updated.id;
  }

  const owner = await tx.owner.create({
    data: { name: input.storeName, whatsappNumber: input.whatsappNumber },
  });
  const business = await tx.business.create({
    data: {
      ownerId: owner.id,
      name: input.storeName,
      whatsappNumber: input.whatsappNumber,
      googleMapsUrl: input.mapsUrl,
      status: "PENDING_VERIFICATION",
    },
  });
  return business.id;
}

async function upsertBusinessForActive(
  tx: Tx,
  existingBusinessId: string | null,
  input: ActivationInput,
  place: ResolvedPlace,
  reviewUrl: string,
): Promise<string> {
  const data = {
    name: input.storeName,
    whatsappNumber: input.whatsappNumber,
    googleMapsUrl: input.mapsUrl,
    placeId: place.placeId,
    googleReviewUrl: reviewUrl,
    googleRating: place.rating ?? null,
    googleReviewCount: place.reviewCount ?? null,
    lastKnownReviewCount: place.reviewCount ?? null,
    status: "ACTIVE" as const,
  };

  if (existingBusinessId) {
    const updated = await tx.business.update({ where: { id: existingBusinessId }, data });
    return updated.id;
  }

  const owner = await tx.owner.create({
    data: { name: input.storeName, whatsappNumber: input.whatsappNumber },
  });
  const business = await tx.business.create({ data: { ...data, ownerId: owner.id } });
  return business.id;
}
