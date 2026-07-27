"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateUserPreferences } from "@/app/actions/settings"
import {
  DATE_FORMAT_LABELS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_DASHBOARD_RANGE_OPTIONS,
  TIME_FORMAT_LABELS,
  TIME_FORMAT_OPTIONS,
} from "@/types/settings"
import type { UserPreferences } from "@/types/settings"
import { DATE_RANGE_PRESET_LABELS } from "@/types/report"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface PreferenceSettingsCardProps {
  preferences: UserPreferences
}

export function PreferenceSettingsCard({ preferences }: PreferenceSettingsCardProps) {
  const router = useRouter()
  const [form, setForm] = useState(preferences)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateUserPreferences(form)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <SectionCard
      title="User Preferences"
      description="Organization-wide display defaults for dates, times, and the dashboard."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-format">Date Format</Label>
            <select
              id="date-format"
              value={form.dateFormat}
              onChange={(event) => setForm((current) => ({ ...current, dateFormat: event.target.value as UserPreferences["dateFormat"] }))}
              className={selectClassName}
            >
              {DATE_FORMAT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {DATE_FORMAT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time-format">Time Format</Label>
            <select
              id="time-format"
              value={form.timeFormat}
              onChange={(event) => setForm((current) => ({ ...current, timeFormat: event.target.value as UserPreferences["timeFormat"] }))}
              className={selectClassName}
            >
              {TIME_FORMAT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {TIME_FORMAT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-dashboard-range">Default Dashboard Range</Label>
            <select
              id="default-dashboard-range"
              value={form.defaultDashboardRange}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultDashboardRange: event.target.value as UserPreferences["defaultDashboardRange"] }))
              }
              className={selectClassName}
            >
              {DEFAULT_DASHBOARD_RANGE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {DATE_RANGE_PRESET_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {success && <span className="text-sm text-muted-foreground">Saved.</span>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </SectionCard>
  )
}
