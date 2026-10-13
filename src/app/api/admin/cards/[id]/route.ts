import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { getCardById } from "@/server/services/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const card = await getCardById(id);
  if (!card) return jsonError("Card not found", 404);

  return jsonOk(card);
}
