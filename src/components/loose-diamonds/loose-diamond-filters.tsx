"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Input } from "@/components/ui/input"
import {
  DIAMOND_COLOR_SUGGESTIONS,
  DIAMOND_CLARITY_SUGGESTIONS,
  DIAMOND_GROWTH_TYPE_SUGGESTIONS,
  DIAMOND_SHAPE_SUGGESTIONS,
  LOOSE_DIAMOND_STATUSES,
  LOOSE_DIAMOND_STATUS_LABELS,
} from "@/types/loose-diamond"

const selectClassName =
  "h-8 rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function LooseDiamondFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const shape = searchParams.get("shape") ?? ""
  const color = searchParams.get("color") ?? ""
  const clarity = searchParams.get("clarity") ?? ""
  const growthType = searchParams.get("growthType") ?? ""
  const status = searchParams.get("status") ?? ""
  const minCarat = searchParams.get("minCarat") ?? ""
  const maxCarat = searchParams.get("maxCarat") ?? ""
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

  const hasActiveFilters = Boolean(search || shape || color || clarity || growthType || status || minCarat || maxCarat)

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search by Report #, shape, color, clarity..." className="max-w-xs" />

      <select value={shape} onChange={(event) => updateParams({ shape: event.target.value || null })} className={selectClassName}>
        <option value="">All shapes</option>
        {DIAMOND_SHAPE_SUGGESTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select value={color} onChange={(event) => updateParams({ color: event.target.value || null })} className={selectClassName}>
        <option value="">All colors</option>
        {DIAMOND_COLOR_SUGGESTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select value={clarity} onChange={(event) => updateParams({ clarity: event.target.value || null })} className={selectClassName}>
        <option value="">All clarities</option>
        {DIAMOND_CLARITY_SUGGESTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={growthType}
        onChange={(event) => updateParams({ growthType: event.target.value || null })}
        className={selectClassName}
      >
        <option value="">All growth types</option>
        {DIAMOND_GROWTH_TYPE_SUGGESTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select value={status} onChange={(event) => updateParams({ status: event.target.value || null })} className={selectClassName}>
        <option value="">All statuses</option>
        {LOOSE_DIAMOND_STATUSES.map((value) => (
          <option key={value} value={value}>
            {LOOSE_DIAMOND_STATUS_LABELS[value]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Min ct"
          value={minCarat}
          onChange={(event) => updateParams({ minCarat: event.target.value || null })}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Max ct"
          value={maxCarat}
          onChange={(event) => updateParams({ maxCarat: event.target.value || null })}
          className="w-24"
        />
      </div>
    </FilterBar>
  )
}
