"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, USER_ROLE_LABELS } from "@/types/profile"
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/types/employee"

export function EmployeeFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const employmentStatus = searchParams.get("employmentStatus") ?? "all"
  const department = searchParams.get("department") ?? "all"
  const role = searchParams.get("role") ?? "all"
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      updateParams({ q: search || null })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasActiveFilters = Boolean(search || employmentStatus !== "all" || department !== "all" || role !== "all")

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or position..."
        className="max-w-xs"
      />

      <Select value={employmentStatus} onValueChange={(value) => updateParams({ employmentStatus: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {EMPLOYMENT_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {EMPLOYMENT_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={department} onValueChange={(value) => updateParams({ department: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {DEPARTMENTS.map((value) => (
            <SelectItem key={value} value={value}>
              {DEPARTMENT_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={role} onValueChange={(value) => updateParams({ role: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {USER_ROLES.map((value) => (
            <SelectItem key={value} value={value}>
              {USER_ROLE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  )
}
