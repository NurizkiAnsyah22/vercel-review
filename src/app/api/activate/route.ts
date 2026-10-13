import { NextResponse } from "next/server";
import { getEnv } from "@/server/config/env";
import { jsonError } from "@/server/http/respond";
import { checkRateLimit, clientIp } from "@/server/rate-limit/limiter";
import { activateCard } from "@/server/services/activation";
import { activateSchema } from "@/server/validation/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getEnv();
  const limit = await checkRateLimit(
    `activate:${clientIp(request)}`,
    env.RATE_LIMIT_ACTIVATE_PER_HOUR,
    3600,
  );
  if (!limit.allowed) {
    return jsonError("Terlalu banyak percobaan aktivasi. Coba lagi nanti.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Data tidak valid", 422, parsed.error.flatten().fieldErrors);
  }

  const result = await activateCard(parsed.data);

  switch (result.status) {
    case "activated":
      return NextResponse.json({
        data: {
          status: "activated",
          cardCode: result.cardCode,
          reviewUrl: result.reviewUrl,
          qr: result.qr,
          qrError: result.qrError ?? null,
        },
      });
    case "already_active":
      // Idempotent: the card stays ACTIVE and is never re-assigned.
      return NextResponse.json({
        data: {
          status: "already_active",
          cardCode: result.cardCode,
          reviewUrl: result.reviewUrl,
        },
      });
    case "pending":
      return NextResponse.json(
        { data: { status: "pending", cardCode: result.cardCode, reason: result.reason } },
        { status: 202 },
      );
    case "suspended":
      return jsonError("Kartu ini sedang tidak aktif.", 409);
    case "not_found":
      return jsonError("Kartu tidak ditemukan.", 404);
    default:
      return jsonError("Kartu tidak dapat diaktivasi.", 409);
  }
}
