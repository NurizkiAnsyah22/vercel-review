import { getAdminSession } from "@/server/auth/guard";
import { upsertAdminUser } from "@/server/auth/admin-users";
import { verifyAdminCredentials } from "@/server/auth/password";
import { jsonError, jsonOk } from "@/server/http/respond";
import { recordAudit } from "@/server/services/audit";
import { changePasswordSchema } from "@/server/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-service password change for the logged-in admin.
 * Persists the new hash in `admin_users`, so it takes effect immediately for
 * that email (and overrides any legacy env fallback).
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Data tidak valid", 422, parsed.error.flatten().fieldErrors);
  }

  const verified = await verifyAdminCredentials(session.sub, parsed.data.currentPassword);
  if (!verified) {
    return jsonError("Password saat ini salah", 400);
  }

  const user = await upsertAdminUser({ email: session.sub, password: parsed.data.newPassword });

  await recordAudit({
    actorEmail: session.sub,
    action: "admin.password.change",
    targetType: "admin_user",
    targetId: user.id,
  });

  return jsonOk({ message: "Password berhasil diubah", email: user.email });
}
