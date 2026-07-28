"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, RELATED_RECORD_TYPES, RELATED_RECORD_TYPE_LABELS } from "@/types/document"
import type { EmployeeOption } from "@/types/production"

interface DocumentFiltersProps {
  employees: EmployeeOption[]
}

export function DocumentFilters({ employees }: DocumentFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const documentType = searchParams.get("documentType") ?? "all"
  const uploadedBy = searchParams.get("uploadedBy") ?? "all"
  const relatedType = searchParams.get("relatedType") ?? "all"
  const uploadedAfter = searchParams.get("uploadedAfter") ?? ""
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

  const hasActiveFilters = Boolean(
    search || documentType !== "all" || uploadedBy !== "all" || relatedType !== "all" || uploadedAfter
  )

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="max-w-xs" />

      <Select value={documentType} onValueChange={(value) => updateParams({ documentType: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All document types</SelectItem>
          {DOCUMENT_TYPES.map((value) => (
            <SelectItem key={value} value={value}>
              {DOCUMENT_TYPE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={relatedType} onValueChange={(value) => updateParams({ relatedType: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All related entities</SelectItem>
          {RELATED_RECORD_TYPES.map((value) => (
            <SelectItem key={value} value={value}>
              {RELATED_RECORD_TYPE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={uploadedBy} onValueChange={(value) => updateParams({ uploadedBy: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All uploaders</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={uploadedAfter}
        onChange={(event) => updateParams({ uploadedAfter: event.target.value || null })}
        className="w-auto"
        aria-label="Uploaded after"
      />
    </FilterBar>
  )
}
