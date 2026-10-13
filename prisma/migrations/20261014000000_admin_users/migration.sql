-- Multiple admin accounts (replaces the single env-only admin).
-- Additive and non-destructive.

CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");
