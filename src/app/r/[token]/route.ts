import { NextResponse, after } from "next/server";
import { prisma } from "@/server/db/client";
import { renderInfoPage } from "@/server/http/html";
import { getPublicAppUrl } from "@/lib/public-url";
import { parseSource, recordInteraction } from "@/server/services/interaction";
import { checkRateLimit, clientIp } from "@/server/rate-limit/limiter";
import { getEnv } from "@/server/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Card entry point: https://review.virai.id/r/{token}?s=qr|nfc
 *
 * - UNACTIVATED -> redirect to the activation form
 * - PENDING / SUSPENDED -> informational page (never redirects to Google)
 * - ACTIVE -> records the interaction and 302-redirects straight to Google
 *   (no intermediate landing page).
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const source = parseSource(url.searchParams.get("s"));

  const env = getEnv();
  const limit = await checkRateLimit(
    `redirect:${clientIp(request)}`,
    env.RATE_LIMIT_REDIRECT_PER_MINUTE,
    60,
  );
  if (!limit.allowed) {
    return htmlResponse(
      renderInfoPage({
        title: "Terlalu banyak permintaan",
        message: "Mohon coba lagi beberapa saat lagi.",
      }),
      429,
    );
  }

  const card = await prisma.card.findUnique({
    where: { publicToken: token },
    include: { business: { select: { id: true, googleReviewUrl: true } } },
  });

  if (!card) {
    return htmlResponse(
      renderInfoPage({
        title: "Kartu tidak ditemukan",
        message: "Kartu ini tidak terdaftar. Periksa kembali kartu Anda.",
      }),
      404,
    );
  }

  if (card.status === "UNACTIVATED") {
    // Build the redirect from PUBLIC_APP_URL, never from request.url: behind a
    // platform proxy the request URL is an internal host the phone cannot open.
    return NextResponse.redirect(`${getPublicAppUrl()}/activate/${token}`, 302);
  }

  if (card.status === "PENDING") {
    return htmlResponse(
      renderInfoPage({
        title: "Kartu sedang diverifikasi",
        message: "Data toko pada kartu ini sedang kami periksa. Mohon coba lagi nanti.",
      }),
    );
  }

  if (card.status === "SUSPENDED") {
    return htmlResponse(
      renderInfoPage({
        title: "Kartu tidak aktif",
        message: "Kartu ini sedang tidak aktif. Hubungi admin untuk bantuan.",
      }),
    );
  }

  const reviewUrl = card.business?.googleReviewUrl;
  if (!reviewUrl) {
    return htmlResponse(
      renderInfoPage({
        title: "Kartu belum siap",
        message: "Kartu ini belum memiliki link review. Hubungi admin untuk bantuan.",
      }),
    );
  }

  const cardId = card.id;
  const businessId = card.businessId;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  // Record the interaction AFTER the redirect is sent (Vercel supports `after`).
  after(async () => {
    await recordInteraction({ cardId, businessId, source, ip, userAgent });
  });

  return NextResponse.redirect(reviewUrl, 302);
}
