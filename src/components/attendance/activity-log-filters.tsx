"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ACTIVITY_STATUSES, ACTIVITY_STATUS_LABELS } from "@/types/daily-activity"
import type { AttendanceEmployeeOption } from "@/types/attendance"

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface ActivityLogFiltersProps {
  employees: AttendanceEmployeeOption[]
}

// Uses its own "activity*" query param names (distinct from the existing
// attendance-history filters on the same page) so the two filter bars
// never collide or overwrite each other's state.
export function ActivityLogFilters({ employees }: ActivityLogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const employeeId = searchParams.get("activityEmployeeId") ?? ""
  const status = searchParams.get("activityStatus") ?? ""
  const search = searchParams.get("activitySearch") ?? ""
  const preset = (searchParams.get("activityPreset") as DateRangePreset | null) ?? "7d"
  const from = searchParams.get("activityFrom") ?? ""
  const to = searchParams.get("activityTo") ?? ""

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
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const hasActiveFilters = Boolean(employeeId || status || search || preset !== "7d")

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    ;["activityEmployeeId", "activityStatus", "activitySearch", "activityPreset", "activityFrom", "activityTo"].forEach((key) =>
      params.delete(key)
    )
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <FilterBar hasActiveFilters={hasActiveFilters} onClear={clearAll}>
      <Input
        value={search}
        onChange={(event) => updateParams({ activitySearch: event.target.value || null })}
        placeholder="Search activities..."
        className="w-48"
      />

      <select
        value={employeeId}
        onChange={(event) => updateParams({ activityEmployeeId: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All employees</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(event) => updateParams({ activityStatus: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All statuses</option>
        {ACTIVITY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {ACTIVITY_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={preset}
        onChange={(event) => updateParams({ activityPreset: event.target.value, activityFrom: null, activityTo: null })}
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
          <Input type="date" value={from} onChange={(event) => updateParams({ activityFrom: event.target.value })} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(event) => updateParams({ activityTo: event.target.value })} className="w-auto" />
        </>
      )}
    </FilterBar>
  )
}
