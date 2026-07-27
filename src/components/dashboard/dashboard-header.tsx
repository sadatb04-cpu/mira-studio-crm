"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { DASHBOARD_DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface DashboardHeaderProps {
  preset: DateRangePreset
  from?: string
  to?: string
}

export function DashboardHeader({ preset, from, to }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <PageHeader
      title="Executive Dashboard"
      description="A live view of revenue, operations, and workforce performance."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={(event) => updateParams({ preset: event.target.value, from: null, to: null })}
            className={selectClassName}
          >
            {DASHBOARD_DATE_RANGE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {DATE_RANGE_PRESET_LABELS[value]}
              </option>
            ))}
          </select>

          {preset === "custom" && (
            <>
              <Input
                type="date"
                value={from ?? ""}
                onChange={(event) => updateParams({ from: event.target.value })}
                className="h-8 w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={to ?? ""}
                onChange={(event) => updateParams({ to: event.target.value })}
                className="h-8 w-auto"
              />
            </>
          )}
        </div>
      }
    />
  )
}
