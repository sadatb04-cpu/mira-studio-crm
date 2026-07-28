"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { JEWELRY_CATEGORIES, JEWELRY_STATUSES, JEWELRY_STATUS_LABELS } from "@/types/jewelry"

const STOCK_LEVEL_OPTIONS = ["in_stock", "low_stock", "out_of_stock"] as const
const STOCK_LEVEL_LABELS: Record<(typeof STOCK_LEVEL_OPTIONS)[number], string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
}

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function JewelryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const category = searchParams.get("category") ?? ""
  const status = searchParams.get("status") ?? ""
  const stockLevel = searchParams.get("stockLevel") ?? ""
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

  const hasActiveFilters = Boolean(search || category || status || stockLevel)

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search by SKU or product name..." className="max-w-xs" />

      <select value={category} onChange={(event) => updateParams({ category: event.target.value || null })} className={selectClassName}>
        <option value="">All categories</option>
        {JEWELRY_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select value={status} onChange={(event) => updateParams({ status: event.target.value || null })} className={selectClassName}>
        <option value="">All statuses</option>
        {JEWELRY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {JEWELRY_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

      <select value={stockLevel} onChange={(event) => updateParams({ stockLevel: event.target.value || null })} className={selectClassName}>
        <option value="">All stock levels</option>
        {STOCK_LEVEL_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {STOCK_LEVEL_LABELS[value]}
          </option>
        ))}
      </select>
    </FilterBar>
  )
}
