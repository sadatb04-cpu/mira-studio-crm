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

// ---------------------------------------------------------------------------
// Bulk import - same "raw row, then re-validated normalized input" split
// Orders uses (orderImportRowSchema / orderImportInputSchema). Only Name and
// Phone reject a row; an invalid email is the one other reject reason
// (matching Orders' "only missing customer name/order number, invalid
// dates, invalid email... reject a row" rule) - an unrecognized Source
// value never rejects a row, it's just left unset (see lead-import-config.ts's
// matchByLabel).
// ---------------------------------------------------------------------------

const optionalImportEmail = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.email().safeParse(value).success, { error: "Enter a valid email address." })

export const leadImportRowSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Name is required." }),
  phone: z.string().trim().min(1, { error: "Phone / WhatsApp is required." }),
  email: optionalImportEmail,
  source: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type LeadImportRowSchemaInput = z.infer<typeof leadImportRowSchema>

// Server-side safety-net re-validation of the already-normalized
// LeadImportInput the wizard sends to importLeadsChunk - same role as
// orderImportInputSchema.safeParse(row.input) in importOrdersChunk.
export const leadImportInputSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: optionalImportEmail,
  source: z.enum(LEAD_SOURCES).optional(),
  notes: z.string().trim().optional(),
})
