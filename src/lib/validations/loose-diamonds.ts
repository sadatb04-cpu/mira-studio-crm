import { z } from "zod"

import { LOOSE_DIAMOND_STATUSES } from "@/types/loose-diamond"

export const looseDiamondFormSchema = z.object({
  reportNumber: z.string().trim().min(1, { error: "Report Number is required." }).max(50),
  lab: z.string().trim().max(50).optional(),
  shape: z.string().trim().max(50).optional(),
  carat: z.coerce.number().positive({ error: "Carat must be greater than 0." }),
  color: z.string().trim().max(20).optional(),
  clarity: z.string().trim().max(20).optional(),
  cut: z.string().trim().max(20).optional(),
  polish: z.string().trim().max(20).optional(),
  symmetry: z.string().trim().max(20).optional(),
  fluorescence: z.string().trim().max(30).optional(),
  growthType: z.string().trim().max(50).optional(),
  countryOfOrigin: z.string().trim().max(50).optional(),
  costUsd: z.coerce.number().min(0, { error: "Cost cannot be negative." }),
  sellingPrice: z.coerce.number().min(0, { error: "Selling price cannot be negative." }),
  status: z.enum(LOOSE_DIAMOND_STATUSES, { error: "Select a status." }),
  supplierId: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type LooseDiamondFormInput = z.infer<typeof looseDiamondFormSchema>

// Applied per-row during bulk import, after column mapping - looser than
// the manual-add schema since every value arrives as a string from the
// parsed file and a missing/malformed value must produce a readable error
// rather than a thrown exception.
export const looseDiamondImportRowSchema = z.object({
  reportNumber: z.string().trim().min(1, { error: "Report Number is required." }),
  carat: z.coerce.number({ error: "Carat must be a number." }).positive({ error: "Carat must be greater than 0." }),
  lab: z.string().trim().optional(),
  shape: z.string().trim().optional(),
  color: z.string().trim().optional(),
  clarity: z.string().trim().optional(),
  cut: z.string().trim().optional(),
  polish: z.string().trim().optional(),
  symmetry: z.string().trim().optional(),
  fluorescence: z.string().trim().optional(),
  growthType: z.string().trim().optional(),
  countryOfOrigin: z.string().trim().optional(),
  costUsd: z.coerce.number({ error: "Cost must be a number." }).min(0).optional(),
  sellingPrice: z.coerce.number({ error: "Selling Price must be a number." }).min(0).optional(),
  status: z.enum(LOOSE_DIAMOND_STATUSES, { error: "Status must be one of: " + LOOSE_DIAMOND_STATUSES.join(", ") }).optional(),
  notes: z.string().trim().optional(),
})

export type LooseDiamondImportRowInput = z.infer<typeof looseDiamondImportRowSchema>

export const updateLooseDiamondStatusSchema = z.object({
  looseDiamondId: z.string().min(1, { error: "Select a diamond." }),
  previousStatus: z.enum(LOOSE_DIAMOND_STATUSES),
  newStatus: z.enum(LOOSE_DIAMOND_STATUSES, { error: "Select a status." }),
  notes: z.string().trim().optional(),
})

export type UpdateLooseDiamondStatusInput = z.infer<typeof updateLooseDiamondStatusSchema>
