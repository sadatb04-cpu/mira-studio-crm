"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/types/lead"

export function LeadFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const status = searchParams.get("status") ?? "all"
  const source = searchParams.get("source") ?? "all"
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

  const hasActiveFilters = Boolean(search || status !== "all" || source !== "all")

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, or email..." className="max-w-xs" />

      <Select value={status} onValueChange={(value) => updateParams({ status: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {LEAD_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {LEAD_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={source} onValueChange={(value) => updateParams({ source: value })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {LEAD_SOURCES.map((value) => (
            <SelectItem key={value} value={value}>
              {LEAD_SOURCE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  )
}
