import bcrypt from "bcryptjs";
import { getEnv } from "../config/env";

/**
 * Validates admin credentials against the env-configured single admin account.
 * Returns false when admin credentials are not configured.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const env = getEnv();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return false;

  if (email.trim().toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return false;

  return bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
}
