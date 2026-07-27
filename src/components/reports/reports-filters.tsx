"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function ReportsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const preset = (searchParams.get("preset") as DateRangePreset | null) ?? "30d"
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

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
    <FilterBar hasActiveFilters={preset !== "30d"} onClear={() => router.push(pathname)}>
      <select
        value={preset}
        onChange={(event) => updateParams({ preset: event.target.value, from: null, to: null })}
        className={selectClassName}
      >
        {DATE_RANGE_PRESETS.map((value) => (
          <option key={value} value={value}>
            {DATE_RANGE_PRESET_LABELS[value]}
          </option>
        ))}
      </select>

      {preset === "custom" && (
        <>
          <Input
            type="date"
            value={from}
            onChange={(event) => updateParams({ from: event.target.value })}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => updateParams({ to: event.target.value })}
            className="w-auto"
          />
        </>
      )}
    </FilterBar>
  )
}
