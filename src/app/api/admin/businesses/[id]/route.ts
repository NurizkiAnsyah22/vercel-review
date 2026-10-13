import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { recordAudit } from "@/server/services/audit";
import { getBusinessDetail, updateBusiness } from "@/server/services/business";
import { businessPatchSchema } from "@/server/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const business = await getBusinessDetail(id);
  if (!business) return jsonError("Bisnis tidak ditemukan", 404);

  return jsonOk(business);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = businessPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Payload tidak valid", 422, parsed.error.flatten().fieldErrors);
  }

  const business = await updateBusiness(id, parsed.data);
  await recordAudit({
    actorEmail: session.sub,
    action: "business.update",
    targetType: "business",
    targetId: id,
    metadata: parsed.data as Record<string, unknown>,
  });

  return jsonOk(business);
}
