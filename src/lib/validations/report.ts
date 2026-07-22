import { z } from "zod"

import { DATE_RANGE_PRESETS } from "@/types/report"

export const dateRangeSchema = z
  .object({
    preset: z.enum(DATE_RANGE_PRESETS),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
  })
  .refine((data) => data.preset !== "custom" || (data.from && data.to), {
    error: "Custom range requires both a start and end date.",
    path: ["from"],
  })

export type DateRangeInput = z.infer<typeof dateRangeSchema>

export const exportReportSchema = dateRangeSchema

export type ExportReportInput = z.infer<typeof exportReportSchema>
