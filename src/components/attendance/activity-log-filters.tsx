"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ACTIVITY_STATUSES, ACTIVITY_STATUS_LABELS } from "@/types/daily-activity"
import type { AttendanceEmployeeOption } from "@/types/attendance"

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

  const employeeId = searchParams.get("activityEmployeeId") ?? "all"
  const status = searchParams.get("activityStatus") ?? "all"
  const search = searchParams.get("activitySearch") ?? ""
  const preset = (searchParams.get("activityPreset") as DateRangePreset | null) ?? "7d"
  const from = searchParams.get("activityFrom") ?? ""
  const to = searchParams.get("activityTo") ?? ""

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const hasActiveFilters = Boolean(employeeId !== "all" || status !== "all" || search || preset !== "7d")

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

      <Select value={employeeId} onValueChange={(value) => updateParams({ activityEmployeeId: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All employees</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => updateParams({ activityStatus: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ACTIVITY_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {ACTIVITY_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={preset}
        onValueChange={(value) => updateParams({ activityPreset: value, activityFrom: null, activityTo: null })}
      >
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
          <Input type="date" value={from} onChange={(event) => updateParams({ activityFrom: event.target.value })} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(event) => updateParams({ activityTo: event.target.value })} className="w-auto" />
        </>
      )}
    </FilterBar>
  )
}
