import { z } from "zod"

import { DEPARTMENTS } from "@/types/profile"
import { EMPLOYMENT_STATUSES } from "@/types/employee"

export const employeeFormSchema = z.object({
  full_name: z.string().trim().min(1, { error: "Full name is required." }),
  email: z.email({ error: "Enter a valid email address." }).optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  department: z.enum(DEPARTMENTS).optional(),
  position: z.string().trim().min(1, { error: "Position is required." }),
  employment_status: z.enum(EMPLOYMENT_STATUSES, { error: "Select an employment status." }),
  hire_date: z.string().trim().min(1, { error: "Hire date is required." }),
})

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>
