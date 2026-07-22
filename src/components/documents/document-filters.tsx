"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, RELATED_RECORD_TYPES, RELATED_RECORD_TYPE_LABELS } from "@/types/document"
import type { EmployeeOption } from "@/types/production"

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface DocumentFiltersProps {
  employees: EmployeeOption[]
}

export function DocumentFilters({ employees }: DocumentFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const documentType = searchParams.get("documentType") ?? ""
  const uploadedBy = searchParams.get("uploadedBy") ?? ""
  const relatedType = searchParams.get("relatedType") ?? ""
  const uploadedAfter = searchParams.get("uploadedAfter") ?? ""
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

  const hasActiveFilters = Boolean(search || documentType || uploadedBy || relatedType || uploadedAfter)

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="max-w-xs" />

      <select
        value={documentType}
        onChange={(event) => updateParams({ documentType: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All document types</option>
        {DOCUMENT_TYPES.map((value) => (
          <option key={value} value={value}>
            {DOCUMENT_TYPE_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={relatedType}
        onChange={(event) => updateParams({ relatedType: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All related entities</option>
        {RELATED_RECORD_TYPES.map((value) => (
          <option key={value} value={value}>
            {RELATED_RECORD_TYPE_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={uploadedBy}
        onChange={(event) => updateParams({ uploadedBy: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All uploaders</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={uploadedAfter}
        onChange={(event) => updateParams({ uploadedAfter: event.target.value || null })}
        className={selectClassName}
        aria-label="Uploaded after"
      />
    </FilterBar>
  )
}
