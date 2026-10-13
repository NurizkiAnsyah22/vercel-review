import { z } from "zod";

/** Treat empty-string env values (e.g. `FOO=`) as "not set". */
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

/**
 * Server-side environment schema.
 * Validated lazily (via getEnv) so that `next build` does not fail when
 * runtime secrets are absent at build time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Managed PostgreSQL (Neon / Supabase). DIRECT_URL is used by Prisma Migrate
  // for the unpooled connection; set it equal to DATABASE_URL when not pooling.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: optionalString,

  // Admin auth
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD_HASH: optionalString,

  // Google Places API (optional: the free Maps-URL path is used when empty)
  GOOGLE_PLACES_API_KEY: optionalString,

  // Public base URL used to build card QR / NFC links (LAN or production).
  // Falls back to APP_BASE_URL when not set.
  PUBLIC_APP_URL: optionalUrl,

  // Rate limits
  RATE_LIMIT_REDIRECT_PER_MINUTE: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_ACTIVATE_PER_HOUR: z.coerce.number().int().positive().default(5),
  // Brute-force protection for the Kode Aktivasi lookup (QR Master flow).
  RATE_LIMIT_ACTIVATION_LOOKUP_PER_MINUTE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_PER_15_MINUTES: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    // eslint-disable-next-line no-console
    console.error("[env] Invalid environment variables:", errors);
    throw new Error("Invalid environment variables. Check .env against .env.example.");
  }

  cached = parsed.data;
  return cached;
}
