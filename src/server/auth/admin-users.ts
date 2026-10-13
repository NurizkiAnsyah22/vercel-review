import bcrypt from "bcryptjs";
import { prisma } from "../db/client";

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/** All admin accounts (never exposes password hashes). */
export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: SUMMARY_SELECT,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Creates an admin or updates its password. Used by the seed script and by the
 * self-service "change password" flow.
 */
export async function upsertAdminUser(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<AdminUserSummary> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, name: input.name ?? null },
    update: {
      passwordHash,
      isActive: true,
      ...(input.name !== undefined ? { name: input.name ?? null } : {}),
    },
    select: SUMMARY_SELECT,
  });
}

export async function markAdminLogin(email: string): Promise<void> {
  await prisma.adminUser
    .update({ where: { email: email.trim().toLowerCase() }, data: { lastLoginAt: new Date() } })
    .catch(() => {
      // best-effort; never block login
    });
}
