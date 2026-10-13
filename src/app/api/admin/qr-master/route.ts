import { NextResponse } from "next/server";
import { getAdminSession } from "@/server/auth/guard";
import { jsonError } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEPRECATED — the shared "QR master" concept has been removed.
 *
 * Every physical card now carries its OWN QR sticker whose payload is
 * `{PUBLIC_APP_URL}/r/{publicToken}` (see /admin/printing → Print Sheet).
 * This endpoint is kept only so old bookmarks/links fail loudly instead of
 * silently building an identifier-less QR again.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  return NextResponse.json(
    {
      error:
        "QR master sudah tidak dipakai. Setiap kartu punya QR sendiri — gunakan /admin/printing (Print Sheet) atau /api/admin/export/cards.",
    },
    { status: 410 },
  );
}
