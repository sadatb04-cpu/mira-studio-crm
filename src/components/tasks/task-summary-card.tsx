"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTaskStatus } from "@/app/actions/tasks"
import { TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/types/task"
import type { TaskDetail, TaskStatus } from "@/types/task"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "Not set"
}

interface TaskSummaryCardProps {
  task: TaskDetail
}

export function TaskSummaryCard({ task }: TaskSummaryCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpdateStatus() {
    setError(null)
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, status)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <SectionCard title="Task Information">
      <div className="flex flex-col gap-4">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Description</dt>
          <dd className="text-sm text-foreground">{task.description ?? "No description provided."}</dd>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Priority</dt>
            <dd className="text-sm text-foreground">{TASK_PRIORITY_LABELS[task.priority]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Due Date</dt>
            <dd className="text-sm text-foreground">{formatDate(task.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Related Order</dt>
            <dd className="text-sm text-foreground">
              {task.order ? (
                <Link href={`/orders/${task.order.id}`} className="text-primary hover:underline">
                  {task.order.order_number}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Related Production Job</dt>
            <dd className="text-sm text-foreground">
              {task.production_job ? (
                <Link href={`/production/${task.production_job.id}`} className="text-primary hover:underline">
                  {task.production_job.job_number}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">Update Status</span>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TASK_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={handleUpdateStatus} disabled={isPending || status === task.status}>
              {isPending ? "Saving..." : "Update Status"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </SectionCard>
  )
}
