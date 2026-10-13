import QRCode from "qrcode";
import { buildPublicCardUrl } from "../../lib/public-url";

/**
 * QR assets are generated ON DEMAND from the immutable card public token.
 *
 * The payload is always `{PUBLIC_APP_URL}/r/{token}` and never changes for a
 * given card, so there is no need to persist PNG/SVG files. Generating them on
 * the fly removes the dependency on a writable local filesystem (which Vercel
 * Functions do not provide) while keeping the printed QR/NFC contract identical:
 *
 *   - card UNACTIVATED -> QR opens the activation form for that exact card
 *   - card ACTIVE      -> QR 302-redirects to that card's Google Review URL
 */
export async function renderQrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(buildPublicCardUrl(token), {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

export async function renderQrSvg(token: string): Promise<string> {
  return QRCode.toString(buildPublicCardUrl(token), {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
