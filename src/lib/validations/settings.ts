import { z } from "zod"

import { DATE_FORMAT_OPTIONS, DEFAULT_DASHBOARD_RANGE_OPTIONS, TIME_FORMAT_OPTIONS, TIMEZONE_OPTIONS } from "@/types/settings"
import { TASK_PRIORITIES } from "@/types/task"

// production.ts exports PRODUCTION_PRIORITIES as ProductionPriority[] (not a
// const-asserted tuple), which z.enum can't infer literals from - redeclared
// here as a literal tuple of the same values instead.
const PRODUCTION_PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.url().safeParse(value).success, { error: "Enter a valid URL." })

export const companyInfoSchema = z.object({
  name: z.string().trim().min(1, { error: "Company name is required." }),
  email: z.email({ error: "Enter a valid email address." }),
  phone: z.string().trim().optional(),
  website: optionalUrl,
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, { error: "Use a 3-letter currency code (e.g. USD)." })
    .transform((value) => value.toUpperCase()),
  timezone: z.enum(TIMEZONE_OPTIONS, { error: "Select a time zone." }),
})

export type CompanyInfoInput = z.infer<typeof companyInfoSchema>

export const userPreferencesSchema = z.object({
  dateFormat: z.enum(DATE_FORMAT_OPTIONS, { error: "Select a date format." }),
  timeFormat: z.enum(TIME_FORMAT_OPTIONS, { error: "Select a time format." }),
  defaultDashboardRange: z.enum(DEFAULT_DASHBOARD_RANGE_OPTIONS, { error: "Select a default dashboard range." }),
})

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>

export const businessRulesSchema = z.object({
  defaultTaskPriority: z.enum(TASK_PRIORITIES, { error: "Select a default task priority." }),
  defaultProductionPriority: z.enum(PRODUCTION_PRIORITY_VALUES, { error: "Select a default production priority." }),
  attendanceCutoffTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a 24-hour time in HH:mm format." }),
})

export type BusinessRulesInput = z.infer<typeof businessRulesSchema>
