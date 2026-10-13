import crypto from "node:crypto";
import { getEnv } from "../config/env";

export const SESSION_COOKIE_NAME = "vrc_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

export type SessionPayload = {
  sub: string;
  exp: number;
};

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(email: string): string {
  const env = getEnv();
  const payload: SessionPayload = { sub: email, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, env.SESSION_SECRET)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const env = getEnv();
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body, env.SESSION_SECRET);
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !crypto.timingSafeEqual(provided, wanted)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}
