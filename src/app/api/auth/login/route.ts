import { NextResponse } from "next/server";
import { getEnv } from "@/server/config/env";
import { verifyAdminCredentials } from "@/server/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/server/auth/session";
import { jsonError } from "@/server/http/respond";
import { checkRateLimit, clientIp } from "@/server/rate-limit/limiter";
import { loginSchema } from "@/server/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await checkRateLimit(
    `login:${clientIp(request)}`,
    getEnv().RATE_LIMIT_LOGIN_PER_15_MINUTES,
    900,
  );
  if (!limit.allowed) {
    return jsonError("Terlalu banyak percobaan login. Coba lagi nanti.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid payload", 422, parsed.error.flatten().fieldErrors);
  }

  const valid = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
  if (!valid) {
    return jsonError("Invalid email or password", 401);
  }

  const env = getEnv();
  const token = createSessionToken(parsed.data.email);

  const response = NextResponse.json({ data: { email: parsed.data.email } });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
