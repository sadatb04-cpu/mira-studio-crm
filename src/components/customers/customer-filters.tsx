"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function CustomerFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const status = searchParams.get("status") ?? ""
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

  const hasActiveFilters = Boolean(search || status)

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
        placeholder="Search by name, email, or company..."
        className="max-w-xs"
      />

      <select
        value={status}
        onChange={(event) => updateParams({ status: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All customers</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </FilterBar>
  )
}
