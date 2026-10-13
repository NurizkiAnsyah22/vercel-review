import { getEnv } from "../server/config/env";

/**
 * Base URL that must be reachable by the customer's phone.
 * Local LAN (http://192.168.x.x:3000) or production (https://review.virai.id).
 */
export function getPublicAppUrl(): string {
  const env = getEnv();
  const base = env.PUBLIC_APP_URL ?? env.APP_BASE_URL;
  return base.replace(/\/+$/, "");
}

/**
 * The card URL — used for BOTH the unique QR sticker and the NFC tag of a card.
 *
 * There is no shared "QR master": every card's QR carries its own public token,
 * which is why the same QR can open the activation form before activation and
 * redirect to that card's Google Review URL afterwards.
 */
export function buildPublicCardUrl(token: string, source?: "qr" | "nfc"): string {
  const base = `${getPublicAppUrl()}/r/${token}`;
  return source ? `${base}?s=${source}` : base;
}

export function buildQrUrl(token: string): string {
  return buildPublicCardUrl(token, "qr");
}

export function buildNfcUrl(token: string): string {
  return buildPublicCardUrl(token, "nfc");
}
