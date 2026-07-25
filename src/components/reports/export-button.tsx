"use client"

import { useState, useTransition } from "react"
import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useHasSpecialPermission } from "@/components/providers/permissions-provider"
import { exportCSV } from "@/app/actions/reports"
import type { DateRangePreset } from "@/types/report"

interface ExportButtonProps {
  preset: DateRangePreset
  from?: string
  to?: string
}

export function ExportButton({ preset, from, to }: ExportButtonProps) {
  const canExport = useHasSpecialPermission("export_reports")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExportCsv() {
    setError(null)
    startTransition(async () => {
      const result = await exportCSV({ preset, from, to })

      if (result.error || !result.csv) {
        setError(result.error ?? "Unable to export report.")
        return
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `mira-report-${preset}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  if (!canExport) return null

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={isPending}>
          <Download className="size-3.5" data-icon="inline-start" />
          {isPending ? "Exporting..." : "Export CSV"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled title="PDF export is not available yet">
          <FileText className="size-3.5" data-icon="inline-start" />
          Export PDF
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
