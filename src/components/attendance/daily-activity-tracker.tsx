"use client"

import type { ComponentProps } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CheckCircle2, Circle, Clock3, ListTodo, Pencil, Play, Plus } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Card } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { buildActivityTimeline, summarizeActivities } from "@/lib/daily-activity-helpers"
import { completeActivity, createActivity, updateOwnActivity } from "@/app/actions/daily-activities"
import { formatClock } from "@/types/attendance"
import { formatActivityDuration } from "@/types/daily-activity"
import type { ActivityConflict, CreateActivityInput, DailyActivity } from "@/types/daily-activity"

function formatTime(value: string | null): string {
  return value ? format(new Date(value), "h:mm a") : "—"
}

interface EditActivityDialogProps {
  activity: DailyActivity
}

// Editing only ever applies to a Pending activity (see updateOwnActivity's
// own rule) - in the new flow that's exclusively a manager-reopened one,
// since a freshly created activity is never Pending, it's immediately
// In Progress.
function EditActivityDialog({ activity }: EditActivityDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(activity.activityTitle)
  const [description, setDescription] = useState(activity.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function reset() {
    setTitle(activity.activityTitle)
    setDescription(activity.description ?? "")
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
      const result = await updateOwnActivity(activity.id, { activityTitle: title, description })
      setIsSaving(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
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
        <button type="button" className="text-muted-foreground hover:text-foreground" title="Edit activity">
          <Pencil className="size-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>Update this activity.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-activity-title">
              Activity Title<span className="text-destructive">*</span>
            </Label>
            <Input id="edit-activity-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-activity-description">Description</Label>
            <textarea
              id="edit-activity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AddActivityButtonProps {
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}

// Owns the whole create flow, including the "already have one running"
// conflict: fill in details -> Create -> if nothing's running, it starts
// immediately; if something IS running, a confirm modal offers "Finish
// Current & Start New" (primary) or "Cancel" - no pause, no resume, never
// more than one running timer. This is the only way an employee ever starts
// an activity - there is no separate Start button anywhere in this UI.
function AddActivityButton({ label = "Add Activity", variant = "default", size = "sm" }: AddActivityButtonProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [conflict, setConflict] = useState<ActivityConflict | null>(null)
  const [pendingInput, setPendingInput] = useState<CreateActivityInput | null>(null)

  function resetForm() {
    setTitle("")
    setDescription("")
    setError(null)
  }

  async function submit(input: CreateActivityInput, finishCurrent: boolean) {
    const result = await createActivity(input, finishCurrent)

    if (result.error) {
      setIsSaving(false)
      setError(result.error)
      return
    }

    if (result.conflict) {
      setIsSaving(false)
      setPendingInput(input)
      setConflict(result.conflict)
      setFormOpen(false)
      return
    }

    setIsSaving(false)
    setFormOpen(false)
    resetForm()
    router.refresh()
  }

  function handleCreate() {
    setError(null)
    if (!title.trim()) {
      setError("Activity title is required.")
      return
    }
    setIsSaving(true)
    void submit({ activityTitle: title, description }, false)
  }

  function handleFinishCurrentAndStartNew() {
    if (!pendingInput) return
    setIsSaving(true)
    void submit(pendingInput, true)
  }

  return (
    <>
      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) resetForm()
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant={variant} size={size}>
            <Plus className="size-3.5" data-icon="inline-start" />
            {label}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>It starts immediately - there&apos;s no separate Start step.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-activity-title">
                Activity Title<span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-activity-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Designing Ring Banner"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-activity-description">Description</Label>
              <textarea
                id="new-activity-description"
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
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} loading={isSaving}>
              Create Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={conflict !== null}
        onOpenChange={(next) => {
          if (!next) {
            setConflict(null)
            setPendingInput(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You already have an active activity</DialogTitle>
            <DialogDescription>
              You can only work on one activity at a time.{" "}
              {conflict && (
                <>
                  <span className="font-medium text-foreground">{conflict.activityTitle}</span> has been running since{" "}
                  {formatTime(conflict.startedAt)}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConflict(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleFinishCurrentAndStartNew} loading={isSaving}>
              Finish Current &amp; Start New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CurrentActivityPanelProps {
  activity: DailyActivity | null
  isFinishing: boolean
  onFinish: (activityId: string) => void
}

function CurrentActivityPanel({ activity, isFinishing, onFinish }: CurrentActivityPanelProps) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (!activity) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [activity])

  const elapsedSeconds =
    activity?.startedAt && now !== null ? Math.max(0, Math.floor((now - new Date(activity.startedAt).getTime()) / 1000)) : 0

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Current Activity</h3>

      {activity ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-foreground">{activity.activityTitle}</p>
            {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
            <p className="text-xs text-muted-foreground">Started {formatTime(activity.startedAt)}</p>
          </div>

          <p className="text-4xl font-semibold tabular-nums text-foreground">{formatClock(elapsedSeconds)}</p>

          <Button type="button" onClick={() => onFinish(activity.id)} loading={isFinishing} className="w-fit">
            <CheckCircle2 className="size-3.5" data-icon="inline-start" />
            Finish Activity
          </Button>
        </div>
      ) : (
        <EmptyState
          icon={Play}
          title="No activity running"
          description="Start your next task to begin tracking your time."
          action={<AddActivityButton label="Start New Activity" size="default" />}
        />
      )}
    </Card>
  )
}

interface TodaysTasksPanelProps {
  activities: DailyActivity[]
}

function TodaysTasksPanel({ activities }: TodaysTasksPanelProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today&apos;s Tasks</h3>
        <AddActivityButton />
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={ListTodo} title="No activities yet" description="Add your first activity to start tracking today's work." />
      ) : (
        <ul className="flex flex-col gap-1">
          {activities.map((activity) => {
            const isCompleted = activity.status === "completed"
            const isRunning = activity.status === "in_progress"

            return (
              <li key={activity.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/40">
                {isCompleted ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle className={cn("mt-0.5 size-4 shrink-0", isRunning ? "text-warning" : "text-muted-foreground")} />
                )}

                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-medium", isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                      {activity.activityTitle}
                    </p>
                    {activity.status === "pending" && <EditActivityDialog activity={activity} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRunning && "Running..."}
                    {isCompleted && `${formatTime(activity.startedAt)}–${formatTime(activity.completedAt)} · ${formatActivityDuration(activity.durationMinutes)}`}
                    {/* Only ever reachable via a manager reopening a past activity - a freshly
                        created one is never Pending. Restarting it is a manager/admin-only
                        action, not exposed here. */}
                    {activity.status === "pending" && "Not started - a manager can restart this"}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
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
  const currentActivity = activities.find((activity) => activity.status === "in_progress") ?? null

  function handleFinish(activityId: string) {
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
    <SectionCard title="Today's Activity" description="Log what you're working on - it resets fresh every day.">
      <div className="flex flex-col gap-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CurrentActivityPanel activity={currentActivity} isFinishing={pendingId === currentActivity?.id} onFinish={handleFinish} />
          <TodaysTasksPanel activities={activities} />
        </div>

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
              Activity Timeline
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
