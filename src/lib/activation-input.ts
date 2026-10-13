/**
 * Shared client-side validation for the activation forms (isomorphic module —
 * used by BOTH /activate (QR Master) and /activate/[token] (personalized QR) so
 * the buyer never sees two different rule sets).
 */

const GOOGLE_HOSTS = ["google.com", "google.co.id", "goo.gl"];

export function looksLikeGoogleMaps(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return GOOGLE_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

/** 0812… / +62812… / 812… -> 62812… (matches the backend contract). */
export function normalizePhoneID(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

export const WHATSAPP_ID_PATTERN = /^628[1-9][0-9]{6,11}$/;

export type ActivationFieldErrors = {
  storeName?: string[];
  mapsUrl?: string[];
  whatsappNumber?: string[];
};

export function validateActivationFields(values: {
  storeName: string;
  mapsUrl: string;
  whatsapp: string;
}): ActivationFieldErrors {
  const next: ActivationFieldErrors = {};

  if (values.storeName.trim().length < 2) next.storeName = ["Nama toko minimal 2 karakter."];
  if (!looksLikeGoogleMaps(values.mapsUrl)) {
    next.mapsUrl = ["Masukkan link Google Maps yang valid."];
  }
  if (!WHATSAPP_ID_PATTERN.test(normalizePhoneID(values.whatsapp))) {
    next.whatsappNumber = ["Nomor WhatsApp tidak valid. Contoh: 081234567890"];
  }

  return next;
}

export function hasFieldErrors(errors: ActivationFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
