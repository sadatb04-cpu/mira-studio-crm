"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, USER_ROLE_LABELS } from "@/types/profile"
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/types/employee"

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function EmployeeFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const employmentStatus = searchParams.get("employmentStatus") ?? ""
  const department = searchParams.get("department") ?? ""
  const role = searchParams.get("role") ?? ""
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const hasActiveFilters = Boolean(search || employmentStatus || department || role)

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

      <select
        value={employmentStatus}
        onChange={(event) => updateParams({ employmentStatus: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All statuses</option>
        {EMPLOYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {EMPLOYMENT_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={department}
        onChange={(event) => updateParams({ department: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All departments</option>
        {DEPARTMENTS.map((value) => (
          <option key={value} value={value}>
            {DEPARTMENT_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={role}
        onChange={(event) => updateParams({ role: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All roles</option>
        {USER_ROLES.map((value) => (
          <option key={value} value={value}>
            {USER_ROLE_LABELS[value]}
          </option>
        ))}
      </select>
    </FilterBar>
  )
}
