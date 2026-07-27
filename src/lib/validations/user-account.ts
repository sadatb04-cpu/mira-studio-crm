import { z } from "zod"

import { DEPARTMENTS, USER_ROLES } from "@/types/profile"
import { passwordSchema } from "@/lib/validations/password"

export const createUserAccountSchema = z
  .object({
    fullName: z.string().trim().min(1, { error: "Full name is required." }),
    email: z.email({ error: "Enter a valid email address." }),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(USER_ROLES, { error: "Select a role." }),
    department: z.enum(DEPARTMENTS).optional(),
    employeeId: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type CreateUserAccountInput = z.infer<typeof createUserAccountSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES, { error: "Select a role." }),
})

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
