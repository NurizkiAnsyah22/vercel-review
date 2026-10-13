import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { renderQrPng, renderQrSvg } from "@/server/services/qr-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the QR asset for a card token, generated on demand.
 *   GET /api/qr/{token}?format=png  (default)
 *   GET /api/qr/{token}?format=svg
 *
 * The payload is derived from the immutable public token, so the image is
 * deterministic and can be cached aggressively by the CDN.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";

  const card = await prisma.card.findUnique({
    where: { publicToken: token },
    select: { id: true },
  });

  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body =
    format === "svg" ? await renderQrSvg(token) : new Uint8Array(await renderQrPng(token));

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": format === "svg" ? "image/svg+xml" : "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
