"use client"

import { useState, useTransition } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { exportAttendanceHistoryCsv } from "@/app/actions/attendance"
import type { AttendanceHistoryFilters } from "@/types/attendance"

interface AttendanceExportButtonProps {
  filters: AttendanceHistoryFilters
}

export function AttendanceExportButton({ filters }: AttendanceExportButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    setError(null)
    startTransition(async () => {
      const result = await exportAttendanceHistoryCsv(filters)

      if (result.error || !result.csv) {
        setError(result.error ?? "Unable to export attendance history.")
        return
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `attendance-history-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
        <Download className="size-3.5" data-icon="inline-start" />
        {isPending ? "Exporting..." : "Export CSV"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
