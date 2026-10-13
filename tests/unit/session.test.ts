import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/server/auth/session";

describe("admin session token", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken("admin@virai.id");
    const payload = verifySessionToken(token);
    expect(payload?.sub).toBe("admin@virai.id");
    expect(payload?.exp).toBeGreaterThan(Date.now());
  });

  it("rejects tampered or malformed tokens", () => {
    const token = createSessionToken("admin@virai.id");
    expect(verifySessionToken(`${token}x`)).toBeNull();
    expect(verifySessionToken("garbage")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
  });
});
