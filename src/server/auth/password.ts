import bcrypt from "bcryptjs";
import { prisma } from "../db/client";
import { getEnv } from "../config/env";
import { logger } from "../../lib/logger";
import { markAdminLogin } from "./admin-users";

/**
 * Verifies admin credentials and returns the canonical (lowercased) email when
 * valid, or null when invalid.
 *
 * Order of precedence:
 *  1. DB-backed `admin_users` (supports MULTIPLE admins + password changes).
 *  2. Legacy single env admin (ADMIN_EMAIL / ADMIN_PASSWORD_HASH) — used ONLY
 *     when the email has no DB row, so a leftover env var can never keep an old
 *     password valid after a password change.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  const user = await prisma.adminUser
    .findUnique({ where: { email: normalized } })
    .catch((error: unknown) => {
      logger.error("Admin lookup failed; falling back to env admin", {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

  if (user) {
    if (!user.isActive) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    await markAdminLogin(user.email);
    return user.email;
  }

  const env = getEnv();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return null;
  if (normalized !== env.ADMIN_EMAIL.toLowerCase()) return null;

  const ok = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
  return ok ? env.ADMIN_EMAIL.toLowerCase() : null;
}
