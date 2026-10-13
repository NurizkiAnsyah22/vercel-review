import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { logger } from "../../lib/logger";

export type AuditInput = {
  actorEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Best-effort audit logging; never breaks the primary action. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorEmail: input.actorEmail,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      action: input.action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
