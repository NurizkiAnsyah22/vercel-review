import { z } from "zod";
import { isGoogleMapsUrl } from "../services/places";

// Indonesian mobile numbers: 08xxxxxxxxxx or +628xxxxxxxxxx
const WHATSAPP_REGEX = /^(\+?62|0)8[1-9][0-9]{6,11}$/;

/**
 * Physical card activation. The card is identified EITHER by the personalized
 * public token (per-card QR path, legacy) OR by the printed Kode Aktivasi
 * (QR MASTER path). Exactly one of the two must be present.
 */
export const activateSchema = z
  .object({
    token: z.string().trim().min(6, "Token tidak valid").max(64).optional(),
    activationCode: z.string().trim().min(4, "Kode aktivasi wajib diisi").max(64).optional(),
    storeName: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(160),
    whatsappNumber: z
      .string()
      .trim()
      .regex(WHATSAPP_REGEX, "Nomor WhatsApp tidak valid (contoh: 08123456789)"),
    mapsUrl: z
      .string()
      .trim()
      .url("Link tidak valid")
      .refine(isGoogleMapsUrl, "Harus berupa link Google Maps"),
  })
  .refine((value) => Boolean(value.token) !== Boolean(value.activationCode), {
    message: "Sertakan tepat satu dari token atau activationCode",
    path: ["token"],
  });

/** Step 1 of the QR MASTER flow: verify the printed Kode Aktivasi. */
export const activationCodeLookupSchema = z.object({
  activationCode: z.string().trim().min(4, "Kode aktivasi wajib diisi").max(64),
});

export type ActivateInput = z.infer<typeof activateSchema>;
export type ActivationCodeLookupInput = z.infer<typeof activationCodeLookupSchema>;
