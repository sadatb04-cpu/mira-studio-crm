"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Link as LinkIcon,
  Table as TableIcon,
  Upload,
  UploadCloud,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { parseCsvFile, parseCsvText, parseXlsxFile } from "@/lib/import/parse-table"
import type { ParsedTable } from "@/lib/import/parse-table"
import { applyColumnMapping, autoDetectColumnMapping } from "@/lib/import/column-mapping"
import type { ColumnMapping } from "@/lib/import/column-mapping"
import { fetchGoogleSheetCsv } from "@/app/actions/inventory"
import { IMPORT_SOURCE_TYPES, IMPORT_SOURCE_TYPE_LABELS } from "@/types/import"
import type { DuplicateResolution, ImportDuplicateMatch, ImportRowResult, ImportSourceType, ImportSummary } from "@/types/import"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

const SOURCE_ICONS: Record<ImportSourceType, typeof FileSpreadsheet> = {
  xlsx: FileSpreadsheet,
  csv: TableIcon,
  pdf: FileText,
  google_sheets: LinkIcon,
}

const CHUNK_SIZE = 20

type WizardStep = "source" | "upload" | "mapping" | "preview" | "importing" | "summary"

interface WizardRow<TField extends string, TInput> {
  rowIndex: number
  mapped: Partial<Record<TField, string>>
  input: TInput | null
  errors: string[]
  duplicateOf: ImportDuplicateMatch | null
  resolution: DuplicateResolution
}

export interface ImportWizardPreviewColumn<TField extends string, TInput> {
  label: string
  get: (row: { mapped: Partial<Record<TField, string>>; input: TInput | null }) => string
}

export interface ImportWizardConfig<TField extends string, TInput extends object> {
  title: string
  entityLabel: string
  targetFields: readonly TField[]
  fieldLabels: Record<TField, string>
  fieldAliases: Record<TField, string[]>
  requiredFields: TField[]
  // Allowing "create a duplicate anyway" only makes sense for a category
  // whose unique key is an assigned code (SKU) rather than a real-world
  // natural key (a diamond's Report Number) - see loose-diamonds config.
  allowCreateDuplicate: boolean
  parseRow: (mapped: Partial<Record<TField, string>>) => { input: TInput | null; errors: string[] }
  buildCandidateKey: (input: TInput) => string
  previewColumns: ImportWizardPreviewColumn<TField, TInput>[]
  findDuplicatesAction: (
    candidates: { rowIndex: number; key: string }[]
  ) => Promise<{ matches?: Record<number, ImportDuplicateMatch>; error?: string }>
  importChunkAction: (
    rows: { rowIndex: number; input: TInput; duplicateId: string | null; resolution: DuplicateResolution }[]
  ) => Promise<{ results?: ImportRowResult[]; error?: string }>
  recordBatchAction: (input: {
    sourceType: ImportSourceType
    sourceName: string
    googleSheetUrl?: string
    summary: ImportSummary
  }) => Promise<{ error?: string }>
}

interface ImportWizardProps<TField extends string, TInput extends object> {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ImportWizardConfig<TField, TInput>
}

function downloadErrorReport(entityLabel: string, errors: string[]) {
  const csv = ["Row,Error", ...errors.map((message) => `"${message.replace(/"/g, '""')}"`)].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${entityLabel.toLowerCase().replace(/\s+/g, "-")}-import-errors.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportWizard<TField extends string, TInput extends object>({
  open,
  onOpenChange,
  config,
}: ImportWizardProps<TField, TInput>) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<WizardStep>("source")
  const [sourceType, setSourceType] = useState<ImportSourceType | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [googleSheetUrl, setGoogleSheetUrl] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping<TField>>({})
  const [rows, setRows] = useState<WizardRow<TField, TInput>[]>([])
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [rowErrors, setRowErrors] = useState<string[]>([])

  function reset() {
    setStep("source")
    setSourceType(null)
    setSourceName("")
    setGoogleSheetUrl("")
    setIsParsing(false)
    setIsDraggingFile(false)
    setParseError(null)
    setTable(null)
    setMapping({})
    setRows([])
    setProgress({ done: 0, total: 0 })
    setSummary(null)
    setRowErrors([])
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) reset()
  }

  function buildRows(parsedTable: ParsedTable, columnMapping: ColumnMapping<TField>): WizardRow<TField, TInput>[] {
    return parsedTable.rows.map((rawRow, rowIndex) => {
      const mapped = applyColumnMapping(rawRow, columnMapping, config.targetFields)
      const { input, errors } = config.parseRow(mapped)
      return { rowIndex, mapped, input, errors, duplicateOf: null, resolution: "skip" as DuplicateResolution }
    })
  }

  function goToMapping(parsed: ParsedTable) {
    setTable(parsed)
    setMapping(autoDetectColumnMapping(parsed.headers, config.targetFields, config.fieldAliases))
    setStep("mapping")
  }

  async function parsePdfTableLazy(file: File): Promise<ParsedTable> {
    const { parsePdfTable } = await import("@/lib/import/parse-pdf")
    return parsePdfTable(file)
  }

  async function handleFileSelected(file: File) {
    if (!sourceType || sourceType === "google_sheets") return

    setIsParsing(true)
    setParseError(null)
    setSourceName(file.name)

    try {
      const parsed =
        sourceType === "csv" ? await parseCsvFile(file) : sourceType === "xlsx" ? await parseXlsxFile(file) : await parsePdfTableLazy(file)
      goToMapping(parsed)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to parse this file.")
    } finally {
      setIsParsing(false)
    }
  }

  async function handleGoogleSheetFetch() {
    if (!googleSheetUrl.trim()) {
      setParseError("Paste a Google Sheets link first.")
      return
    }

    setIsParsing(true)
    setParseError(null)
    setSourceName(googleSheetUrl)

    const result = await fetchGoogleSheetCsv(googleSheetUrl.trim())

    if (result.error || !result.csv) {
      setIsParsing(false)
      setParseError(result.error ?? "Unable to fetch this Google Sheet.")
      return
    }

    try {
      goToMapping(parseCsvText(result.csv))
    } catch {
      setParseError("Unable to parse this sheet's contents.")
    } finally {
      setIsParsing(false)
    }
  }

  async function handleMappingContinue() {
    if (!table) return

    const built = buildRows(table, mapping)
    setIsCheckingDuplicates(true)

    const candidates = built
      .filter((row): row is WizardRow<TField, TInput> & { input: TInput } => row.input !== null)
      .map((row) => ({ rowIndex: row.rowIndex, key: config.buildCandidateKey(row.input) }))

    const result = await config.findDuplicatesAction(candidates)
    setIsCheckingDuplicates(false)

    const matches = result.matches ?? {}
    const withDuplicates = built.map((row) => {
      const match = matches[row.rowIndex]
      return match ? { ...row, duplicateOf: match } : row
    })

    setRows(withDuplicates)
    setStep("preview")
  }

  function updateResolution(rowIndex: number, resolution: DuplicateResolution) {
    setRows((current) => current.map((row) => (row.rowIndex === rowIndex ? { ...row, resolution } : row)))
  }

  async function handleStartImport() {
    if (!sourceType) return

    setStep("importing")
    setRowErrors([])

    const importable = rows.filter((row) => row.input && row.errors.length === 0)
    const errorCount = rows.length - importable.length

    const tally: ImportSummary = { totalRows: rows.length, created: 0, updated: 0, skipped: 0, errors: errorCount }
    const collectedErrors: string[] = []

    setProgress({ done: 0, total: importable.length })

    for (let start = 0; start < importable.length; start += CHUNK_SIZE) {
      const chunk = importable.slice(start, start + CHUNK_SIZE)
      const payload = chunk.map((row) => ({
        rowIndex: row.rowIndex,
        input: row.input as TInput,
        duplicateId: row.duplicateOf?.id ?? null,
        resolution: row.resolution,
      }))

      const result = await config.importChunkAction(payload)

      if (result.error) {
        tally.errors += chunk.length
        collectedErrors.push(result.error)
      } else {
        for (const rowResult of result.results ?? []) {
          if (rowResult.status === "created") tally.created += 1
          else if (rowResult.status === "updated") tally.updated += 1
          else if (rowResult.status === "skipped") tally.skipped += 1
          else {
            tally.errors += 1
            if (rowResult.message) collectedErrors.push(`Row ${rowResult.rowIndex + 1}: ${rowResult.message}`)
          }
        }
      }

      setProgress({ done: Math.min(start + CHUNK_SIZE, importable.length), total: importable.length })
    }

    await config.recordBatchAction({
      sourceType,
      sourceName: sourceName || IMPORT_SOURCE_TYPE_LABELS[sourceType],
      googleSheetUrl: sourceType === "google_sheets" ? googleSheetUrl : undefined,
      summary: tally,
    })

    setSummary(tally)
    setRowErrors(collectedErrors)
    setStep("summary")
  }

  function handleFinish() {
    handleOpenChange(false)
    router.refresh()
  }

  const validCount = rows.filter((row) => row.input && row.errors.length === 0 && !row.duplicateOf).length
  const duplicateCount = rows.filter((row) => row.duplicateOf).length
  const errorCount = rows.filter((row) => row.errors.length > 0).length
  const acceptAttr =
    sourceType === "xlsx" ? ".xlsx" : sourceType === "csv" ? ".csv,text/csv" : sourceType === "pdf" ? "application/pdf" : undefined

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-5">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {step === "source" && "Choose where your data is coming from."}
            {step === "upload" && sourceType && `Upload a ${IMPORT_SOURCE_TYPE_LABELS[sourceType]} file.`}
            {step === "mapping" && "Match your file's columns to inventory fields."}
            {step === "preview" && "Review rows before importing."}
            {step === "importing" && `Importing your ${config.entityLabel.toLowerCase()}...`}
            {step === "summary" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {step === "source" && (
          <div className="grid grid-cols-2 gap-3">
            {IMPORT_SOURCE_TYPES.map((type) => {
              const Icon = SOURCE_ICONS[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSourceType(type)
                    setStep("upload")
                  }}
                  className="glass-surface-soft flex flex-col items-center gap-2 rounded-xl p-5 text-center transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{IMPORT_SOURCE_TYPE_LABELS[type]}</span>
                </button>
              )
            })}
          </div>
        )}

        {step === "upload" && sourceType && (
          <div className="flex flex-col gap-4">
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setStep("source")}>
              <ArrowLeft className="size-3.5" data-icon="inline-start" />
              Back
            </Button>

            {sourceType === "google_sheets" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="sheet-url">Google Sheets link</Label>
                <Input
                  id="sheet-url"
                  value={googleSheetUrl}
                  onChange={(event) => setGoogleSheetUrl(event.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <p className="text-xs text-muted-foreground">
                  The sheet must be shared as &quot;Anyone with the link can view.&quot;
                </p>
                <Button type="button" size="sm" className="w-fit" loading={isParsing} onClick={() => void handleGoogleSheetFetch()}>
                  Fetch Sheet
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleFileSelected(file)
                  }}
                />
                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDraggingFile(true)
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDraggingFile(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file) void handleFileSelected(file)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors duration-150 ease-premium",
                    isDraggingFile && "border-primary bg-primary/5"
                  )}
                >
                  <UploadCloud className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag and drop your file here, or</p>
                  <Button type="button" size="sm" loading={isParsing} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-3.5" data-icon="inline-start" />
                    Choose File
                  </Button>
                  {sourceType === "pdf" && (
                    <p className="text-xs text-muted-foreground">
                      Works best with a simple exported table. Scanned/image-only PDFs aren&apos;t supported.
                    </p>
                  )}
                </div>
              </div>
            )}

            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {step === "mapping" && table && (
          <div className="flex flex-col gap-4">
            <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Source Column</th>
                  </tr>
                </thead>
                <tbody>
                  {config.targetFields.map((field) => (
                    <tr key={field} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-foreground">
                        {config.fieldLabels[field]}
                        {config.requiredFields.includes(field) && <span className="text-destructive">*</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping[field] ?? ""}
                          onChange={(event) =>
                            setMapping((current) => ({ ...current, [field]: event.target.value || undefined }))
                          }
                          className={selectClassName}
                        >
                          <option value="">— Not mapped —</option>
                          {table.headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="size-3.5" data-icon="inline-start" />
                Back
              </Button>
              <Button type="button" size="sm" loading={isCheckingDuplicates} onClick={() => void handleMappingContinue()}>
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">{validCount} ready</span>
              <span className="rounded-full bg-warning/15 px-2.5 py-1 font-medium text-warning">{duplicateCount} duplicates</span>
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive">{errorCount} errors</span>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Row</th>
                    {config.previewColumns.map((col) => (
                      <th key={col.label} className="px-3 py-2">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowIndex} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{row.rowIndex + 1}</td>
                      {config.previewColumns.map((col) => (
                        <td key={col.label} className="px-3 py-2 text-muted-foreground">
                          {col.get({ mapped: row.mapped, input: row.input }) || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-destructive" title={row.errors.join(" ")}>
                            <XCircle className="size-3.5" />
                            {row.errors[0]}
                          </span>
                        ) : row.duplicateOf ? (
                          <select
                            value={row.resolution}
                            onChange={(event) => updateResolution(row.rowIndex, event.target.value as DuplicateResolution)}
                            className={selectClassName}
                          >
                            <option value="skip">Skip (matches &quot;{row.duplicateOf.label}&quot;)</option>
                            <option value="update">Update Existing</option>
                            {config.allowCreateDuplicate && <option value="create_duplicate">Create Duplicate</option>}
                          </select>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <Check className="size-3.5" />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("mapping")}>
                <ArrowLeft className="size-3.5" data-icon="inline-start" />
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={rows.every((row) => row.errors.length > 0)}
                onClick={() => void handleStartImport()}
              >
                Start Import
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-brand-secondary transition-all duration-300 ease-premium"
                style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Importing {progress.done} of {progress.total} rows...
            </p>
          </div>
        )}

        {step === "summary" && summary && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="size-10 text-success" />
              <p className="text-sm font-medium text-foreground">Import complete</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{summary.created}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{summary.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{summary.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {rowErrors.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Some rows had errors
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => downloadErrorReport(config.entityLabel, rowErrors)}
                  >
                    <Download className="size-3" data-icon="inline-start" />
                    Download Report
                  </Button>
                </div>
                <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
                  {rowErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="button" size="sm" className="self-end" onClick={handleFinish}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
