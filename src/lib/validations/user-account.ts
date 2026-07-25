import { z } from "zod"

import { DEPARTMENTS, USER_ROLES } from "@/types/profile"

export const createUserAccountSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Full name is required." }),
  email: z.email({ error: "Enter a valid email address." }),
  role: z.enum(USER_ROLES, { error: "Select a role." }),
  department: z.enum(DEPARTMENTS).optional(),
  employeeId: z.string().trim().optional(),
})

export type CreateUserAccountInput = z.infer<typeof createUserAccountSchema>
