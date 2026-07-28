"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateBusinessRules } from "@/app/actions/settings"
import { PRODUCTION_PRIORITY_LABELS } from "@/types/production"
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/types/task"
import type { BusinessRules } from "@/types/settings"

const PRODUCTION_PRIORITY_VALUES: BusinessRules["defaultProductionPriority"][] = ["low", "normal", "high", "urgent"]

interface BusinessRulesCardProps {
  businessRules: BusinessRules
}

export function BusinessRulesCard({ businessRules }: BusinessRulesCardProps) {
  const router = useRouter()
  const [form, setForm] = useState(businessRules)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateBusinessRules(form)
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
      title="Business Rules"
      description="Default priority applied when new tasks or production jobs are created. Orders have no priority field in the schema, so no order-priority rule is offered here."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-task-priority">Default Task Priority</Label>
            <Select
              value={form.defaultTaskPriority}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, defaultTaskPriority: value as BusinessRules["defaultTaskPriority"] }))
              }
            >
              <SelectTrigger id="default-task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TASK_PRIORITY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-production-priority">Default Production Priority</Label>
            <Select
              value={form.defaultProductionPriority}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  defaultProductionPriority: value as BusinessRules["defaultProductionPriority"],
                }))
              }
            >
              <SelectTrigger id="default-production-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_PRIORITY_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCTION_PRIORITY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <Label htmlFor="attendance-cutoff-time">Attendance Cutoff Time</Label>
          <Input
            id="attendance-cutoff-time"
            type="time"
            value={form.attendanceCutoffTime}
            onChange={(event) => setForm((current) => ({ ...current, attendanceCutoffTime: event.target.value }))}
            className="w-auto"
          />
          <p className="text-xs text-muted-foreground">
            Open work sessions still running at this time are automatically closed, and employees who never checked in
            are marked absent for the day.
          </p>
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
