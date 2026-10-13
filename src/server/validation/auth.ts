import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

/** Self-service password change (authenticated admin). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi").max(72),
    // bcrypt only considers the first 72 bytes; cap the input accordingly.
    newPassword: z.string().min(8, "Password baru minimal 8 karakter").max(72),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Password baru harus berbeda dari password saat ini",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
