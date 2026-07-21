import { z } from "zod"

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Enter your full name." }),
    email: z.email({ error: "Enter a valid email address." }),
    password: z.string().min(8, { error: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type SignupInput = z.infer<typeof signupSchema>
