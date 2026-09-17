import { z } from "zod"

import { LEAD_SOURCES, LEAD_STATUSES } from "@/types/lead"

// Deliberately minimal, matching the Quick Add form exactly - full_name and
// phone are the only required fields. Phone is checked for presence only,
// not a strict E.164 pattern: real-world entry during rapid successive
// capture is messy, and rejecting a plausible number here would directly
// fight the "fast, spreadsheet-like capture" goal. interested_product/
// requirements_notes/status/priority/assigned_to are intentionally absent
// from this schema, not just the form - createLead can never set them to
// anything other than their DB defaults.
export const createLeadSchema = z.object({
  full_name: z.string().trim().min(1, { error: "Name is required." }),
  phone: z.string().trim().min(1, { error: "Phone / WhatsApp is required." }),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, { error: "Enter a valid email." }),
  source: z.enum(LEAD_SOURCES, { error: "Select a source." }).optional(),
  notes: z.string().trim().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES, { error: "Select a status." }),
})

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
