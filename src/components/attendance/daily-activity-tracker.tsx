"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CheckCircle2, Clock3, ListTodo, Pencil, Play, Plus } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { buildActivityTimeline, summarizeActivities } from "@/lib/daily-activity-helpers"
import { completeActivity, createActivity, startActivity, updateOwnActivity } from "@/app/actions/daily-activities"
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_TONE, formatActivityDuration } from "@/types/daily-activity"
import type { DailyActivity } from "@/types/daily-activity"

function formatTime(value: string | null): string {
  return value ? format(new Date(value), "h:mm a") : "—"
}

interface AddActivityDialogProps {
  editing?: DailyActivity | null
  onDone?: () => void
}

function AddActivityDialog({ editing, onDone }: AddActivityDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(editing?.activityTitle ?? "")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function reset() {
    setTitle(editing?.activityTitle ?? "")
    setDescription(editing?.description ?? "")
    setError(null)
  }

  function handleSubmit() {
    setError(null)

    if (!title.trim()) {
      setError("Activity title is required.")
      return
    }

    setIsSaving(true)

    void (async () => {
      const result = editing
        ? await updateOwnActivity(editing.id, { activityTitle: title, description })
        : await createActivity({ activityTitle: title, description })

      setIsSaving(false)

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      onDone?.()
      router.refresh()
    })()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <button type="button" className="text-muted-foreground hover:text-foreground" title="Edit activity">
            <Pencil className="size-3.5" />
          </button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Activity
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Activity" : "Add Activity"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this pending activity." : "Log something you're about to work on today."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-title">
              Activity Title<span className="text-destructive">*</span>
            </Label>
            <Input id="activity-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Upload Diamond Inventory" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-description">Description</Label>
            <textarea
              id="activity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional details..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            {editing ? "Save Changes" : "Add Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DailyActivityTrackerProps {
  activities: DailyActivity[]
  sessions: { checkIn: string | null }[]
}

export function DailyActivityTracker({ activities, sessions }: DailyActivityTrackerProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const summary = summarizeActivities(activities)
  const timeline = buildActivityTimeline(sessions, activities)
  const hasInProgress = activities.some((activity) => activity.status === "in_progress")

  function handleStart(activityId: string) {
    setError(null)
    setPendingId(activityId)
    void (async () => {
      const result = await startActivity(activityId)
      setPendingId(null)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })()
  }

  function handleComplete(activityId: string) {
    setError(null)
    setPendingId(activityId)
    void (async () => {
      const result = await completeActivity(activityId)
      setPendingId(null)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })()
  }

  return (
    <SectionCard
      title="Today's Activity Tracker"
      description="Log what you're working on - it resets fresh every day."
      actions={<AddActivityDialog />}
    >
      <div className="flex flex-col gap-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {activities.length === 0 ? (
          <EmptyState icon={ListTodo} title="No activities yet" description="Add your first activity to start tracking today's work." />
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((activity) => (
              <div key={activity.id} className="glass-surface-soft flex flex-col gap-2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{activity.activityTitle}</p>
                      {activity.status === "pending" && <AddActivityDialog editing={activity} />}
                    </div>
                    {activity.description && <p className="text-xs text-muted-foreground">{activity.description}</p>}
                  </div>
                  <StatusBadge
                    label={ACTIVITY_STATUS_LABELS[activity.status]}
                    tone={ACTIVITY_STATUS_TONE[activity.status]}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Started <span className="font-medium text-foreground">{formatTime(activity.startedAt)}</span>
                  </span>
                  {activity.completedAt && (
                    <span>
                      Completed <span className="font-medium text-foreground">{formatTime(activity.completedAt)}</span>
                    </span>
                  )}
                  {activity.durationMinutes !== null && (
                    <span>
                      Duration <span className="font-medium text-foreground">{formatActivityDuration(activity.durationMinutes)}</span>
                    </span>
                  )}
                </div>

                {activity.status === "pending" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    disabled={hasInProgress}
                    loading={pendingId === activity.id}
                    title={hasInProgress ? "Finish your current activity first" : undefined}
                    onClick={() => handleStart(activity.id)}
                  >
                    <Play className="size-3.5" data-icon="inline-start" />
                    Start Activity
                  </Button>
                )}

                {activity.status === "in_progress" && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-fit"
                    loading={pendingId === activity.id}
                    onClick={() => handleComplete(activity.id)}
                  >
                    <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                    Complete Activity
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today&apos;s Summary</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Total", value: summary.total },
              { label: "Completed", value: summary.completed },
              { label: "Pending", value: summary.pending },
              { label: "In Progress", value: summary.inProgress },
              { label: "Productive Time", value: formatActivityDuration(summary.totalProductiveMinutes) },
              { label: "Avg Duration", value: formatActivityDuration(summary.averageDurationMinutes || null) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {timeline.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Clock3 className="size-3.5" />
              Timeline
            </h3>
            <div className="flex flex-col gap-2.5">
              {timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {format(new Date(event.time), "h:mm a")}
                  </span>
                  <span className="relative flex-1 border-l border-border pb-2.5 pl-3 text-sm text-foreground">
                    <span className="absolute top-1 -left-[3.5px] size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    {event.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
