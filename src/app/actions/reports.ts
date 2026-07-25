"use server"

import { createClient } from "@/lib/supabase/server"
import { requireSpecialPermission } from "@/lib/supabase/permissions"
import { exportReportCsv, resolveDateRange } from "@/lib/supabase/reports"
import { exportReportSchema } from "@/lib/validations/report"
import type { ExportReportInput } from "@/lib/validations/report"

export interface ExportCsvState {
  error?: string
  csv?: string
}

export async function exportCSV(input: ExportReportInput): Promise<ExportCsvState> {
  const validated = exportReportSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()
  const range = resolveDateRange(validated.data.preset, validated.data.from, validated.data.to)

  try {
    await requireSpecialPermission(supabase, "export_reports")
    const csv = await exportReportCsv(supabase, range)
    return { csv }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export report." }
  }
}
