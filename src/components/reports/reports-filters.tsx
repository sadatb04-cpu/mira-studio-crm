"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

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
      <Select value={preset} onValueChange={(value) => updateParams({ preset: value, from: null, to: null })}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((value) => (
            <SelectItem key={value} value={value}>
              {DATE_RANGE_PRESET_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
