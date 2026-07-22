import { z } from "zod"

import { DEPARTMENTS, USER_ROLES } from "@/types/profile"
import { EMPLOYMENT_STATUSES } from "@/types/employee"

export const employeeFormSchema = z.object({
  full_name: z.string().trim().min(1, { error: "Full name is required." }),
  email: z.email({ error: "Enter a valid email address." }),
  phone: z.string().trim().optional(),
  department: z.enum(DEPARTMENTS).optional(),
  role: z.enum(USER_ROLES, { error: "Select a role." }),
  position: z.string().trim().min(1, { error: "Position is required." }),
  employment_status: z.enum(EMPLOYMENT_STATUSES, { error: "Select an employment status." }),
  hire_date: z.string().trim().min(1, { error: "Hire date is required." }),
})

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>

export const createEmployeeSchema = employeeFormSchema.extend({
  profile_id: z.string().min(1, { error: "Select an existing profile to promote." }),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
