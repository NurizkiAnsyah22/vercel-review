import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { recordAudit } from "@/server/services/audit";
import {
  generateQrForCard,
  reactivateCard,
  reassignCard,
  resetCard,
  resolvePendingCard,
  suspendCard,
  type ActionResult,
} from "@/server/services/card-admin";
import { reassignSchema } from "@/server/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set([
  "suspend",
  "reactivate",
  "reset",
  "reassign",
  "resolve",
  "generate-qr",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id, action } = await params;
  if (!ACTIONS.has(action)) return jsonError("Aksi tidak dikenal", 404);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is allowed for most actions
  }

  let result: ActionResult;

  switch (action) {
    case "suspend":
      result = await suspendCard(id);
      break;
    case "reactivate":
      result = await reactivateCard(id);
      break;
    case "reset":
      result = await resetCard(id);
      break;
    case "resolve":
      result = await resolvePendingCard(id);
      break;
    case "generate-qr":
      result = await generateQrForCard(id);
      break;
    case "reassign": {
      const parsed = reassignSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError("Payload tidak valid", 422, parsed.error.flatten().fieldErrors);
      }
      result = await reassignCard(id, parsed.data.businessId);
      break;
    }
    default:
      return jsonError("Aksi tidak dikenal", 404);
  }

  await recordAudit({
    actorEmail: session.sub,
    action: `card.${action}`,
    targetType: "card",
    targetId: id,
    metadata: result.ok ? undefined : { error: result.message },
  });

  return result.ok ? jsonOk({ message: result.message }) : jsonError(result.message, 409);
}
