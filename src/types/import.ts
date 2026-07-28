// Shared bulk-import primitives, reused by every category's import wizard
// (and by the old, dormant inventory import wizard - kept here rather than
// in types/inventory.ts so new code never needs to import from the old
// dormant file).

export const IMPORT_SOURCE_TYPES = ["xlsx", "csv", "pdf", "google_sheets"] as const
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number]

export const IMPORT_SOURCE_TYPE_LABELS: Record<ImportSourceType, string> = {
  xlsx: "Excel (.xlsx)",
  csv: "CSV",
  pdf: "PDF",
  google_sheets: "Google Sheets",
}

export type DuplicateResolution = "skip" | "update" | "create_duplicate"

export interface ImportRowResult {
  rowIndex: number
  status: "created" | "updated" | "skipped" | "error"
  message?: string
}

export interface ImportSummary {
  totalRows: number
  created: number
  updated: number
  skipped: number
  errors: number
}

export interface ImportDuplicateMatch {
  id: string
  label: string
}

