import { prisma } from "../db/client";
import { logger } from "../../lib/logger";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

/**
 * Fixed-window rate limiter backed by PostgreSQL.
 *
 * Vercel Functions are stateless and can scale to many concurrent instances, so
 * an in-memory counter would be ineffective. A single atomic upsert keeps the
 * counter correct across every instance while adding only one cheap query per
 * request.
 *
 * Fails OPEN (allows the request) when the database is unavailable, so a
 * transient DB error never takes down the public redirect.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; reset_seconds: number }>>`
      INSERT INTO rate_limit_buckets (key, count, expires_at)
      VALUES (${key}, 1, now() + (${windowSeconds}::int * interval '1 second'))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.expires_at <= now() THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        expires_at = CASE
          WHEN rate_limit_buckets.expires_at <= now()
            THEN now() + (${windowSeconds}::int * interval '1 second')
          ELSE rate_limit_buckets.expires_at
        END
      RETURNING count,
        GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())))::int AS reset_seconds
    `;

    const row = rows[0];
    const count = Number(row?.count ?? 1);
    const resetSeconds = Number(row?.reset_seconds ?? windowSeconds);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSeconds,
    };
  } catch (error) {
    logger.warn("Rate limit check failed; allowing request", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: 0, resetSeconds: 0 };
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
