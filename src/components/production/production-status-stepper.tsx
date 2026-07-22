"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/shared/section-card"
import { updateProductionStatus } from "@/app/actions/production"
import type { ProductionJobDetail, ProductionStageDetail } from "@/types/production"

const STEP_LABELS = ["Queued", "Casting", "Stone Setting", "Polishing", "Quality Check", "Ready"] as const

function getCurrentStepIndex(status: ProductionJobDetail["status"], stages: ProductionStageDetail[]) {
  if (status === "cancelled") return -1

  const ordered = [...stages].sort((a, b) => a.sequence - b.sequence)
  const completedCount = ordered.filter((stage) => stage.status === "completed").length

  if (completedCount >= ordered.length) return 5

  const current = ordered[completedCount]
  return current?.status === "in_progress" ? completedCount + 1 : 0
}

interface ProductionStatusStepperProps {
  job: ProductionJobDetail
}

export function ProductionStatusStepper({ job }: ProductionStatusStepperProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isCancelled = job.status === "cancelled"
  const isFinished = job.status === "completed" || isCancelled
  const stepIndex = getCurrentStepIndex(job.status, job.stages)

  function handleAction(action: "advance" | "cancel") {
    setError(null)
    startTransition(async () => {
      const result = await updateProductionStatus(job.id, action)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <SectionCard title="Production Status">
      <div className="flex flex-col gap-4">
        {isCancelled ? (
          <p className="text-sm text-destructive">This production job has been cancelled.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {STEP_LABELS.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    index === stepIndex
                      ? "border-primary bg-primary/10 text-primary"
                      : index < stepIndex
                        ? "border-border bg-muted text-muted-foreground"
                        : "border-border text-muted-foreground/60"
                  )}
                >
                  <span>{index + 1}</span>
                  <span>{label}</span>
                </div>
                {index < STEP_LABELS.length - 1 && <div className="h-px w-4 bg-border" aria-hidden="true" />}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!isFinished && (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => handleAction("advance")} disabled={isPending}>
              {isPending ? "Updating..." : stepIndex === 0 ? "Start Casting" : "Complete & Advance"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => handleAction("cancel")}
              disabled={isPending}
            >
              Cancel Job
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
