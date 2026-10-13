import crypto from "node:crypto";
import type { InteractionSource } from "@prisma/client";
import { prisma } from "../db/client";
import { getEnv } from "../config/env";
import { logger } from "../../lib/logger";

/** Hashes identifiers (IP / user-agent) so we never store raw personal data. */
function hashValue(value: string): string {
  const env = getEnv();
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(value).digest("hex").slice(0, 64);
}

export function parseSource(raw: string | null): InteractionSource {
  const value = (raw ?? "").toLowerCase();
  if (value === "qr") return "QR";
  if (value === "nfc") return "NFC";
  return "UNKNOWN";
}

export type RecordInteractionParams = {
  cardId: string;
  businessId: string | null;
  source: InteractionSource;
  ip?: string | null;
  userAgent?: string | null;
};

export async function recordInteraction(
  params: RecordInteractionParams,
): Promise<{ id: string } | null> {
  try {
    return await prisma.interaction.create({
      data: {
        cardId: params.cardId,
        businessId: params.businessId,
        source: params.source,
        ipHash: params.ip ? hashValue(params.ip) : null,
        userAgentHash: params.userAgent ? hashValue(params.userAgent) : null,
      },
      select: { id: true },
    });
  } catch (error) {
    logger.error("Failed to record interaction", {
      cardId: params.cardId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
