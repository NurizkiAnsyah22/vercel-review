import { describe, expect, it } from "vitest";
import { buildNfcUrl, buildPublicCardUrl, getPublicAppUrl } from "@/lib/public-url";
import { cardNfcUrl, cardQrUrl } from "@/server/services/printing";

/**
 * Every physical card carries its OWN QR sticker. That is exactly why the same
 * QR can open the activation form while the card is inactive and redirect to
 * that card's Google Review URL once it is active.
 */
describe("per-card QR", () => {
  it("is unique per card token (no shared master QR)", () => {
    const qrA = cardQrUrl("A8x91Kaaaaaaaaaa11");
    const qrB = cardQrUrl("B72mQ2bbbbbbbbbb22");

    expect(qrA).not.toBe(qrB);
    expect(qrA).toBe(buildPublicCardUrl("A8x91Kaaaaaaaaaa11"));
    // Base URL comes from PUBLIC_APP_URL / APP_BASE_URL, never from a hardcoded host.
    expect(qrA).toBe(`${getPublicAppUrl()}/r/A8x91Kaaaaaaaaaa11`);
  });

  it("uses the SAME target for the QR sticker and the NFC tag of a card", () => {
    const token = "K91zP4kkkkkkkkkk33";
    expect(cardQrUrl(token)).toBe(buildPublicCardUrl(token));
    expect(cardNfcUrl(token)).toBe(buildPublicCardUrl(token, "nfc"));
    expect(cardNfcUrl(token).startsWith(cardQrUrl(token))).toBe(true);
  });

  it("points at the Virai card route, never directly at a Google URL", () => {
    const qr = cardQrUrl("A8x91Kaaaaaaaaaa11");
    expect(qr).toContain("/r/");
    expect(qr).not.toContain("google.com");
    expect(qr).not.toContain("writereview");
  });

  it("keeps a stable payload per card (immutable token => immutable QR)", () => {
    const token = "dYRoDVB8r9QsVyNU";
    expect(cardQrUrl(token)).toBe(cardQrUrl(token));
    expect(buildNfcUrl(token)).toBe(cardNfcUrl(token));
  });
});
