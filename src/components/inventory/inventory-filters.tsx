"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS, STOCK_STATUS_LABELS } from "@/types/inventory"

const STOCK_STATUS_OPTIONS = ["in_stock", "low_stock", "out_of_stock"] as const

export function InventoryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const category = searchParams.get("category") ?? "all"
  const stockStatus = searchParams.get("stockStatus") ?? "all"
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

  const hasActiveFilters = Boolean(search || category !== "all" || stockStatus !== "all")

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

      <Select value={category} onValueChange={(value) => updateParams({ category: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {INVENTORY_CATEGORIES.map((value) => (
            <SelectItem key={value} value={value}>
              {INVENTORY_CATEGORY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stockStatus} onValueChange={(value) => updateParams({ stockStatus: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stock statuses</SelectItem>
          {STOCK_STATUS_OPTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {STOCK_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  )
}
