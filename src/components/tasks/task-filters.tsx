"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/types/task"
import type { EmployeeOption } from "@/types/production"

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface TaskFiltersProps {
  employees: EmployeeOption[]
}

export function TaskFilters({ employees }: TaskFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const status = searchParams.get("status") ?? ""
  const priority = searchParams.get("priority") ?? ""
  const assignedTo = searchParams.get("assignedTo") ?? ""
  const due = searchParams.get("due") ?? ""
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

  const hasActiveFilters = Boolean(search || status || priority || assignedTo || due)

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." className="max-w-xs" />

      <select
        value={status}
        onChange={(event) => updateParams({ status: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All statuses</option>
        {TASK_STATUSES.map((value) => (
          <option key={value} value={value}>
            {TASK_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(event) => updateParams({ priority: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All priorities</option>
        {TASK_PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {TASK_PRIORITY_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={assignedTo}
        onChange={(event) => updateParams({ assignedTo: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All assignees</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ))}
      </select>

      <select
        value={due}
        onChange={(event) => updateParams({ due: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">Any due date</option>
        <option value="due_today">Due Today</option>
        <option value="overdue">Overdue</option>
      </select>
    </FilterBar>
  )
}
