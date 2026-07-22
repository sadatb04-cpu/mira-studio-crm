"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateBusinessRules } from "@/app/actions/settings"
import { PRODUCTION_PRIORITY_LABELS } from "@/types/production"
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/types/task"
import type { BusinessRules } from "@/types/settings"

const PRODUCTION_PRIORITY_VALUES: BusinessRules["defaultProductionPriority"][] = ["low", "normal", "high", "urgent"]

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

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
            <select
              id="default-task-priority"
              value={form.defaultTaskPriority}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultTaskPriority: event.target.value as BusinessRules["defaultTaskPriority"] }))
              }
              className={selectClassName}
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="default-production-priority">Default Production Priority</Label>
            <select
              id="default-production-priority"
              value={form.defaultProductionPriority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultProductionPriority: event.target.value as BusinessRules["defaultProductionPriority"],
                }))
              }
              className={selectClassName}
            >
              {PRODUCTION_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCTION_PRIORITY_LABELS[value]}
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
