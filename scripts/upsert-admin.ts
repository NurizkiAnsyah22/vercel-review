import { readFileSync } from "node:fs";

/**
 * Create or update an admin account.
 *
 * Usage:
 *   npx tsx scripts/upsert-admin.ts <email> <password> [name]
 * or via npm script:
 *   npm run admin:add -- "admin@example.com" "secret123" "Nama Admin"
 *
 * Loads DATABASE_URL from .env (so Prisma Client can connect) before importing
 * the Prisma-backed modules. Never prints the password.
 */
function loadEnvFile(path: string): void {
  try {
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional (CI can pass DATABASE_URL directly).
  }
}

loadEnvFile(".env");

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: tsx scripts/upsert-admin.ts <email> <password> [name]');
  process.exit(1);
}

const { upsertAdminUser } = await import("../src/server/auth/admin-users");

try {
  const user = await upsertAdminUser({ email, password, name: name ?? null });
  console.log(`OK: admin "${user.email}" tersimpan (id=${user.id}).`);
  process.exit(0);
} catch (error) {
  console.error("Gagal menyimpan admin:", error instanceof Error ? error.message : error);
  process.exit(1);
}
