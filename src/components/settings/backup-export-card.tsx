"use client"

import { useState, useTransition } from "react"
import { Database, Download, FileJson } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { exportConfiguration, exportDatabaseSummary, exportSettings } from "@/app/actions/settings"

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

type ExportKind = "summary" | "settings" | "configuration"

export function BackupExportCard() {
  const [error, setError] = useState<string | null>(null)
  const [pendingKind, setPendingKind] = useState<ExportKind | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExport(kind: ExportKind) {
    setError(null)
    setPendingKind(kind)
    const today = new Date().toISOString().slice(0, 10)

    startTransition(async () => {
      if (kind === "summary") {
        const result = await exportDatabaseSummary()
        if (result.error || !result.content) {
          setError(result.error ?? "Unable to export database summary.")
          return
        }
        downloadFile(result.content, `mira-database-summary-${today}.csv`, "text/csv;charset=utf-8;")
        return
      }

      if (kind === "settings") {
        const result = await exportSettings()
        if (result.error || !result.content) {
          setError(result.error ?? "Unable to export settings.")
          return
        }
        downloadFile(result.content, `mira-settings-${today}.csv`, "text/csv;charset=utf-8;")
        return
      }

      const result = await exportConfiguration()
      if (result.error || !result.content) {
        setError(result.error ?? "Unable to export configuration.")
        return
      }
      downloadFile(result.content, `mira-configuration-${today}.json`, "application/json;charset=utf-8;")
    })
  }

  return (
    <SectionCard title="Backup / Export" description="Download a snapshot of database activity or your current configuration.">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleExport("summary")} disabled={isPending}>
            <Database className="size-3.5" data-icon="inline-start" />
            {isPending && pendingKind === "summary" ? "Exporting..." : "Export Database Summary"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleExport("settings")} disabled={isPending}>
            <Download className="size-3.5" data-icon="inline-start" />
            {isPending && pendingKind === "settings" ? "Exporting..." : "Export Settings"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleExport("configuration")} disabled={isPending}>
            <FileJson className="size-3.5" data-icon="inline-start" />
            {isPending && pendingKind === "configuration" ? "Exporting..." : "Download Configuration"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </SectionCard>
  )
}
