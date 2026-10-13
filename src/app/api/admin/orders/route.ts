import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { normalizeWhatsappNumber } from "@/lib/phone";
import { createOrder, listOrders } from "@/server/services/order";
import { recordAudit } from "@/server/services/audit";
import { createOrderSchema, ORDER_STATUSES } from "@/server/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const statusParam = new URL(request.url).searchParams.get("status");
  const status = ORDER_STATUSES.find((value) => value === statusParam);

  return jsonOk({ items: await listOrders(status ? { status } : undefined) });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Payload tidak valid", 422, parsed.error.flatten().fieldErrors);
  }

  try {
    const order = await createOrder({
      cardId: parsed.data.cardId,
      buyerWhatsappNumber: normalizeWhatsappNumber(parsed.data.buyerWhatsappNumber),
      buyerName: parsed.data.buyerName ?? null,
      note: parsed.data.note ?? null,
    });

    await recordAudit({
      actorEmail: session.sub,
      action: "order.create",
      targetType: "order",
      targetId: order.id,
      metadata: { cardId: parsed.data.cardId },
    });

    return jsonOk(order, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Gagal membuat order", 409);
  }
}
