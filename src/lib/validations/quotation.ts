import { z } from "zod"

import { QUOTATION_STATUSES } from "@/types/quotation"

// Optional, blank-means-zero per the sprint spec - the form always sends a
// number (defaulting blank inputs to 0 client-side), so this just guards
// against a negative value slipping through.
const costFieldSchema = z.coerce.number().min(0, { error: "Must be zero or greater." }).optional()

export const quotationFormSchema = z.object({
  quote_name: z.string().trim().min(1, { error: "Quote name is required." }),
  metal_cost: costFieldSchema,
  stone_cost: costFieldSchema,
  labor_cost: costFieldSchema,
  cad_cost: costFieldSchema,
  setting_cost: costFieldSchema,
  certification_cost: costFieldSchema,
  hallmark_cost: costFieldSchema,
  packaging_cost: costFieldSchema,
  shipping_cost: costFieldSchema,
  other_charges: costFieldSchema,
  discount: costFieldSchema,
  notes: z.string().trim().optional(),
})

export type QuotationFormInput = z.infer<typeof quotationFormSchema>

export const quotationStatusSchema = z.object({
  status: z.enum(QUOTATION_STATUSES, { error: "Select a status." }),
})

export type QuotationStatusInput = z.infer<typeof quotationStatusSchema>
