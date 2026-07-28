"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DASHBOARD_DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

interface DashboardHeaderProps {
  preset: DateRangePreset
  from?: string
  to?: string
}

export function DashboardHeader({ preset, from, to }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  return (
    <PageHeader
      title="Executive Dashboard"
      description="A live view of revenue, operations, and workforce performance."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(value) => updateParams({ preset: value, from: null, to: null })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_DATE_RANGE_PRESETS.map((value) => (
                <SelectItem key={value} value={value}>
                  {DATE_RANGE_PRESET_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <>
              <Input
                type="date"
                value={from ?? ""}
                onChange={(event) => updateParams({ from: event.target.value })}
                className="h-8 w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={to ?? ""}
                onChange={(event) => updateParams({ to: event.target.value })}
                className="h-8 w-auto"
              />
            </>
          )}
        </div>
      }
    />
  )
}
