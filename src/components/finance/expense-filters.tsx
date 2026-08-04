"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/shared/filter-bar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_EXPENSE_CATEGORY_LABELS } from "@/types/finance"

export function ExpenseFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const category = searchParams.get("category") ?? "all"
  const dateAfter = searchParams.get("dateAfter") ?? ""

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

  const hasActiveFilters = Boolean(category !== "all" || dateAfter)

  return (
    <FilterBar hasActiveFilters={hasActiveFilters} onClear={() => router.push(pathname)}>
      <Select value={category} onValueChange={(value) => updateParams({ category: value })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {FINANCE_EXPENSE_CATEGORIES.map((value) => (
            <SelectItem key={value} value={value}>
              {FINANCE_EXPENSE_CATEGORY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={dateAfter}
        onChange={(event) => updateParams({ dateAfter: event.target.value || null })}
        className="w-auto"
        aria-label="Expensed on or after"
      />
    </FilterBar>
  )
}
