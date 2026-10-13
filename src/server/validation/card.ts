import { z } from "zod";

export const CARD_STATUSES = ["UNACTIVATED", "PENDING", "ACTIVE", "SUSPENDED"] as const;

export const ORDER_STATUSES = [
  "WAITING_ACTIVATION",
  "PAID",
  "ACTIVATION_RECEIVED",
  "PROCESSING",
  "ACTIVATED",
  "READY_TO_PRINT",
  "READY_TO_SHIP",
  "SHIPPED",
  "CANCELLED",
] as const;

export const generateCardsSchema = z.object({
  count: z.coerce.number().int().min(1, "Minimum 1 card").max(500, "Maximum 500 cards per batch"),
});

export const listCardsQuerySchema = z.object({
  status: z.enum(CARD_STATUSES).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type GenerateCardsInput = z.infer<typeof generateCardsSchema>;
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
