import { z } from "zod"

import { passwordSchema } from "@/lib/validations/password"

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Current password is required." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>
