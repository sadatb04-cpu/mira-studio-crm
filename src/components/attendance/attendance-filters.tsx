"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABELS } from "@/types/attendance"
import type { AttendanceEmployeeOption } from "@/types/attendance"

interface AttendanceFiltersProps {
  employees: AttendanceEmployeeOption[]
}

export function AttendanceFilters({ employees }: AttendanceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const employeeId = searchParams.get("employeeId") ?? "all"
  const status = searchParams.get("status") ?? "all"
  const preset = (searchParams.get("preset") as DateRangePreset | null) ?? "today"
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

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
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const hasActiveFilters = Boolean(employeeId !== "all" || status !== "all" || preset !== "today")

  return (
    <FilterBar hasActiveFilters={hasActiveFilters} onClear={() => router.push(pathname)}>
      <Select value={employeeId} onValueChange={(value) => updateParams({ employeeId: value })}>
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

      <Select value={status} onValueChange={(value) => updateParams({ status: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ATTENDANCE_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {ATTENDANCE_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
          <Input type="date" value={from} onChange={(event) => updateParams({ from: event.target.value })} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(event) => updateParams({ to: event.target.value })} className="w-auto" />
        </>
      )}
    </FilterBar>
  )
}
