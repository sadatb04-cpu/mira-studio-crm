"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS, STOCK_STATUS_LABELS } from "@/types/inventory"

const STOCK_STATUS_OPTIONS = ["in_stock", "low_stock", "out_of_stock"] as const

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function InventoryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const category = searchParams.get("category") ?? ""
  const stockStatus = searchParams.get("stockStatus") ?? ""
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

  const hasActiveFilters = Boolean(search || category || stockStatus)

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
        placeholder="Search by name or SKU..."
        className="max-w-xs"
      />

      <select
        value={category}
        onChange={(event) => updateParams({ category: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All categories</option>
        {INVENTORY_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {INVENTORY_CATEGORY_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        value={stockStatus}
        onChange={(event) => updateParams({ stockStatus: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All stock statuses</option>
        {STOCK_STATUS_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {STOCK_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
    </FilterBar>
  )
}
