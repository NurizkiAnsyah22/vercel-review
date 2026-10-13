import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

/**
 * Returns the admin session if the request carries a valid session cookie,
 * otherwise null. Admin API routes must call this and return 401 when null.
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
}
