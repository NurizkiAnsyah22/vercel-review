/**
 * Normalizes Indonesian WhatsApp numbers to the canonical `62…` form.
 *
 * 08xx / +628xx / 628xx / 8xx  ->  62…
 * Kept as a small standalone helper because the WhatsApp activation pipeline
 * (which used to own this logic) is no longer part of the app; the number is
 * retained purely as store contact data.
 */
export function normalizeWhatsappNumber(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}
