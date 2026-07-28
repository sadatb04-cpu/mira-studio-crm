"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { SearchInput } from "@/components/shared/search-input"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DIAMOND_COLOR_SUGGESTIONS,
  DIAMOND_CLARITY_SUGGESTIONS,
  DIAMOND_GROWTH_TYPE_SUGGESTIONS,
  DIAMOND_SHAPE_SUGGESTIONS,
  LOOSE_DIAMOND_STATUSES,
  LOOSE_DIAMOND_STATUS_LABELS,
} from "@/types/loose-diamond"

export function LooseDiamondFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const shape = searchParams.get("shape") ?? "all"
  const color = searchParams.get("color") ?? "all"
  const clarity = searchParams.get("clarity") ?? "all"
  const growthType = searchParams.get("growthType") ?? "all"
  const status = searchParams.get("status") ?? "all"
  const minCarat = searchParams.get("minCarat") ?? ""
  const maxCarat = searchParams.get("maxCarat") ?? ""
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
    search ||
      shape !== "all" ||
      color !== "all" ||
      clarity !== "all" ||
      growthType !== "all" ||
      status !== "all" ||
      minCarat ||
      maxCarat
  )

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClear={() => {
        setSearch("")
        router.push(pathname)
      }}
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search by Report #, shape, color, clarity..." className="max-w-xs" />

      <Select value={shape} onValueChange={(value) => updateParams({ shape: value })}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All shapes</SelectItem>
          {DIAMOND_SHAPE_SUGGESTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={color} onValueChange={(value) => updateParams({ color: value })}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All colors</SelectItem>
          {DIAMOND_COLOR_SUGGESTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={clarity} onValueChange={(value) => updateParams({ clarity: value })}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All clarities</SelectItem>
          {DIAMOND_CLARITY_SUGGESTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={growthType} onValueChange={(value) => updateParams({ growthType: value })}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All growth types</SelectItem>
          {DIAMOND_GROWTH_TYPE_SUGGESTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => updateParams({ status: value })}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {LOOSE_DIAMOND_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {LOOSE_DIAMOND_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
