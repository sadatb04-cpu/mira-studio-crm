"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
            <Select
              value={form.dateFormat}
              onValueChange={(value) => setForm((current) => ({ ...current, dateFormat: value as UserPreferences["dateFormat"] }))}
            >
              <SelectTrigger id="date-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DATE_FORMAT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time-format">Time Format</Label>
            <Select
              value={form.timeFormat}
              onValueChange={(value) => setForm((current) => ({ ...current, timeFormat: value as UserPreferences["timeFormat"] }))}
            >
              <SelectTrigger id="time-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TIME_FORMAT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-dashboard-range">Default Dashboard Range</Label>
            <Select
              value={form.defaultDashboardRange}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, defaultDashboardRange: value as UserPreferences["defaultDashboardRange"] }))
              }
            >
              <SelectTrigger id="default-dashboard-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_DASHBOARD_RANGE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DATE_RANGE_PRESET_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
