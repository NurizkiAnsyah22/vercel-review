import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import {
  ACTIVATION_CODE_ALPHABET,
  ACTIVATION_CODE_RANDOM_LENGTH,
  ACTIVATION_CODE_PREFIX,
  isValidActivationCodeFormat,
  normalizeActivationCode,
} from "../../lib/activation-code";

export {
  ACTIVATION_CODE_PATTERN,
  isCompleteActivationCodeInput,
  isValidActivationCodeFormat,
  normalizeActivationCode,
} from "../../lib/activation-code";

type Tx = Prisma.TransactionClient;

/** Cryptographically random, unambiguous activation code (e.g. `VRC-7K4P-92MA`). */
export function generateActivationCode(): string {
  let body = "";
  for (let i = 0; i < ACTIVATION_CODE_RANDOM_LENGTH; i += 1) {
    body += ACTIVATION_CODE_ALPHABET[randomInt(ACTIVATION_CODE_ALPHABET.length)];
  }
  return `${ACTIVATION_CODE_PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/**
 * Reserves `count` codes that are unique among themselves AND against the
 * database. The unique index on Card.activationCode stays the final guard.
 */
export async function generateUniqueActivationCodes(
  count: number,
  tx?: Tx,
): Promise<string[]> {
  const client = tx ?? prisma;
  const codes = new Set<string>();

  // A single read is enough for realistic batch sizes (<= 500 / batch).
  for (let attempt = 0; attempt < 50 && codes.size < count; attempt += 1) {
    while (codes.size < count) codes.add(generateActivationCode());

    const existing = await client.card.findMany({
      where: { activationCode: { in: [...codes] } },
      select: { activationCode: true },
    });
    for (const row of existing) {
      if (row.activationCode) codes.delete(row.activationCode);
    }
  }

  if (codes.size < count) {
    throw new Error("Unable to generate enough unique activation codes");
  }

  return [...codes];
}

export type ActivationCodeLookup =
  | { status: "invalid_format"; code: string }
  | { status: "not_found"; code: string }
  | {
      status: "found";
      code: string;
      card: {
        id: string;
        code: string;
        status: "UNACTIVATED" | "PENDING" | "ACTIVE" | "SUSPENDED";
        publicToken: string;
        businessName: string | null;
        googleReviewUrl: string | null;
      };
    };

/**
 * Looks a card up by activation code. Read-only: it never mutates state, so a
 * buyer can safely pre-verify their code before filling the business form.
 */
export async function lookupCardByActivationCode(rawCode: string): Promise<ActivationCodeLookup> {
  const code = normalizeActivationCode(rawCode);
  if (!isValidActivationCodeFormat(code)) return { status: "invalid_format", code };

  const card = await prisma.card.findUnique({
    where: { activationCode: code },
    include: { business: { select: { name: true, googleReviewUrl: true } } },
  });

  if (!card) return { status: "not_found", code };

  return {
    status: "found",
    code,
    card: {
      id: card.id,
      code: card.code,
      status: card.status,
      publicToken: card.publicToken,
      businessName: card.business?.name ?? null,
      googleReviewUrl: card.business?.googleReviewUrl ?? null,
    },
  };
}
