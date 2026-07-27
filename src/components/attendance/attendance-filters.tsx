"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABELS } from "@/types/attendance"
import type { AttendanceEmployeeOption } from "@/types/attendance"

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface AttendanceFiltersProps {
  employees: AttendanceEmployeeOption[]
}

export function AttendanceFilters({ employees }: AttendanceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const employeeId = searchParams.get("employeeId") ?? ""
  const status = searchParams.get("status") ?? ""
  const preset = (searchParams.get("preset") as DateRangePreset | null) ?? "today"
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

  const hasActiveFilters = Boolean(employeeId || status || preset !== "today")

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => router.push(pathname)}
    >
      <select
        value={employeeId}
        onChange={(event) => updateParams({ employeeId: event.target.value || null })}
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
        onChange={(event) => updateParams({ status: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All statuses</option>
        {ATTENDANCE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {ATTENDANCE_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

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
          <Input type="date" value={from} onChange={(event) => updateParams({ from: event.target.value })} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(event) => updateParams({ to: event.target.value })} className="w-auto" />
        </>
      )}
    </FilterBar>
  )
}
