import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { recordAudit } from "@/server/services/audit";
import { updateOrderStatus } from "@/server/services/order";
import { orderStatusSchema } from "@/server/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Payload tidak valid", 422, parsed.error.flatten().fieldErrors);
  }

  const order = await updateOrderStatus(id, parsed.data.status);
  await recordAudit({
    actorEmail: session.sub,
    action: "order.status",
    targetType: "order",
    targetId: id,
    metadata: { status: parsed.data.status },
  });

  return jsonOk(order);
}
