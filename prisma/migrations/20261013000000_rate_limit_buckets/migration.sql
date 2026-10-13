-- Database-backed fixed-window rate limiter (replaces the Redis-based limiter).
-- Fully serverless-friendly: no external cache required.

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
    "key" VARCHAR(200) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);
