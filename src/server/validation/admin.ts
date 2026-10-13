import { z } from "zod";

export const reassignSchema = z.object({
  businessId: z.string().uuid("businessId tidak valid"),
});

export const businessPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    whatsappNumber: z.string().trim().min(6).max(32).optional(),
    placeId: z.string().trim().max(64).nullable().optional(),
    googleReviewUrl: z.string().trim().url().nullable().optional(),
    lastKnownReviewCount: z.coerce.number().int().min(0).nullable().optional(),
    status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Tidak ada field yang diubah" });

export const cardActionSchema = z.enum([
  "suspend",
  "reactivate",
  "reset",
  "reassign",
  "resolve",
  "generate-qr",
]);

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

export const createOrderSchema = z.object({
  cardId: z.string().uuid("cardId tidak valid"),
  buyerWhatsappNumber: z
    .string()
    .trim()
    .regex(/^(\+?62|0)8[1-9][0-9]{6,11}$/, "Nomor WhatsApp pembeli tidak valid"),
  buyerName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export type BusinessPatchInput = z.infer<typeof businessPatchSchema>;
