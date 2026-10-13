import { describe, expect, it } from "vitest";
import { renderQrPng, renderQrSvg } from "@/server/services/qr-assets";

/**
 * QR assets are rendered on demand from the immutable card public token — there
 * is no filesystem dependency, which keeps the app compatible with Vercel.
 */
const token = `qrtest${Date.now()}`;

describe("QR rendering (on demand, no filesystem)", () => {
  it("renders a PNG buffer for a card token", async () => {
    const png = await renderQrPng(token);
    expect(png.length).toBeGreaterThan(200);
  });

  it("renders an SVG document for a card token", async () => {
    const svg = await renderQrSvg(token);
    expect(svg).toContain("<svg");
  });
});
