/**
 * Activation Code helpers (isomorphic — safe to import from client components).
 *
 * WHY: with the QR MASTER flow every printed card carries the SAME QR
 * ({PUBLIC_APP_URL}/activate), so the QR can no longer identify a card. Each
 * card therefore has its own random, opaque "Kode Aktivasi" printed on it.
 *
 * Rules (see product spec §2/§17):
 * - random + unique, never derived from the sequential Card ID
 * - unambiguous alphabet (no 0/O/1/I) so it is easy to read on a printed card
 * - 8 random characters => 32^8 ≈ 1.1e12 combinations (~40 bits)
 */

export const ACTIVATION_CODE_PREFIX = "VRC";

/** 32 symbols, 5 bits each. Ambiguous glyphs (0, O, 1, I) are excluded. */
export const ACTIVATION_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const GROUP_1 = 4;
const GROUP_2 = 4;
export const ACTIVATION_CODE_RANDOM_LENGTH = GROUP_1 + GROUP_2;

/** Canonical shape, e.g. `VRC-7K4P-92MA`. */
export const ACTIVATION_CODE_PATTERN = /^VRC-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

export function isValidActivationCodeFormat(code: string): boolean {
  return ACTIVATION_CODE_PATTERN.test(code);
}

/**
 * Normalizes free-typed input to the canonical code.
 * "vrc 7k4p 92ma" | "7k4p92ma" | "VRC-7K4P-92MA" -> "VRC-7K4P-92MA"
 */
export function normalizeActivationCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = cleaned.startsWith(ACTIVATION_CODE_PREFIX)
    ? cleaned.slice(ACTIVATION_CODE_PREFIX.length)
    : cleaned;

  if (body.length !== ACTIVATION_CODE_RANDOM_LENGTH) return cleaned;
  return `${ACTIVATION_CODE_PREFIX}-${body.slice(0, GROUP_1)}-${body.slice(GROUP_1)}`;
}

/** Progressive formatting while the buyer types (adds the dashes for them). */
export function formatActivationCodeInput(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = cleaned.startsWith(ACTIVATION_CODE_PREFIX)
    ? cleaned.slice(ACTIVATION_CODE_PREFIX.length)
    : cleaned;

  const limited = body.slice(0, ACTIVATION_CODE_RANDOM_LENGTH);
  if (limited.length <= GROUP_1) return `${ACTIVATION_CODE_PREFIX}-${limited}`;
  return `${ACTIVATION_CODE_PREFIX}-${limited.slice(0, GROUP_1)}-${limited.slice(GROUP_1)}`;
}

/** True when the buyer's input already resolves to a complete, valid code. */
export function isCompleteActivationCodeInput(input: string): boolean {
  return isValidActivationCodeFormat(normalizeActivationCode(input));
}
