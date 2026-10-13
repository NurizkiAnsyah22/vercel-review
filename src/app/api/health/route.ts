import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckState = "up" | "down";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function GET() {
  let ok = true;
  const checks: { database: CheckState } = { database: "down" };

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 4000, "database");
    checks.database = "up";
  } catch (error) {
    ok = false;
    logger.error("Health check: database unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
