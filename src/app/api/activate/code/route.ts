import { NextResponse } from "next/server";
import { getEnv } from "@/server/config/env";
import { jsonError } from "@/server/http/respond";
import { checkRateLimit, clientIp } from "@/server/rate-limit/limiter";
import { lookupCardByActivationCode } from "@/server/services/activation-code";
import { activationCodeLookupSchema } from "@/server/validation/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of the QR MASTER activation flow: verify the Kode Aktivasi printed on
 * the card and return the (non-secret) Card ID so the buyer can continue.
 *
 * Read-only endpoint — it never activates or mutates anything. Rate limited
 * against brute force (the code is the only secret).
 */
export async function POST(request: Request) {
  const env = getEnv();
  const limit = await checkRateLimit(
    `activate-code:${clientIp(request)}`,
    env.RATE_LIMIT_ACTIVATION_LOOKUP_PER_MINUTE,
    60,
  );
  if (!limit.allowed) {
    return jsonError("Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = activationCodeLookupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Kode aktivasi wajib diisi.", 422, parsed.error.flatten().fieldErrors);
  }

  const result = await lookupCardByActivationCode(parsed.data.activationCode);

  if (result.status === "invalid_format" || result.status === "not_found") {
    return jsonError("Kode aktivasi tidak ditemukan. Periksa kembali kode pada kartu Anda.", 404);
  }

  const card = result.card;

  if (card.status === "SUSPENDED") {
    return NextResponse.json(
      {
        data: {
          status: "suspended",
          cardCode: card.code,
          storeName: card.businessName,
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    data: {
      status: card.status,
      cardCode: card.code,
      code: result.code,
      storeName: card.businessName,
      reviewUrl: card.googleReviewUrl,
    },
  });
}
