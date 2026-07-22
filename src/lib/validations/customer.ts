import { z } from "zod"

export const customerFormSchema = z.object({
  full_name: z.string().trim().min(1, { error: "Full name is required." }),
  email: z
    .email({ error: "Enter a valid email address." })
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional(),
  country: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type CustomerFormInput = z.infer<typeof customerFormSchema>
