"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Coffee, Loader2, Play, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/shared/section-card"
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge"
import { LiveDuration } from "@/components/attendance/live-duration"
import { endWork, resumeWork, startBreak, startWork } from "@/app/actions/attendance"
import type { AttendanceRecord } from "@/types/attendance"

interface AttendanceTimerWidgetProps {
  sessions: AttendanceRecord[]
}

export function AttendanceTimerWidget({ sessions }: AttendanceTimerWidgetProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // An auto-inserted "absent" row (no check-in ever happened) isn't a real
  // session - exclude it from the count/summary/button-label logic below,
  // even though it can legitimately be today's only row if reconciliation
  // already ran past the cutoff with nothing recorded.
  const realSessions = sessions.filter((session) => session.status !== "absent")
  const latest = realSessions.length > 0 ? realSessions[realSessions.length - 1] : null
  const isWorking = latest?.status === "working"
  const isOnBreak = latest?.status === "on_break"
  const isLive = isWorking || isOnBreak

  // Each live figure below ticks independently (see LiveDuration) so the
  // 1-second update is scoped to that one text node, not this whole card.
  const currentSegmentStartedAt = latest?.currentSegmentStartedAt ?? null
  const firstCheckIn = realSessions.length > 0 ? realSessions[0].checkIn : null
  const bankedWorkedSeconds = realSessions.reduce((sum, s) => sum + s.totalWorkedSeconds, 0)
  const bankedBreakSeconds = realSessions.reduce((sum, s) => sum + s.totalBreakSeconds, 0)

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <SectionCard title="My Attendance" description="Start, pause, and end your workday.">
      <div className="flex flex-col gap-5">
        {isLive && (
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-muted/30 py-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Current Session</p>
            <LiveDuration
              baseSeconds={latest?.totalWorkedSeconds ?? 0}
              segmentStartedAt={currentSegmentStartedAt}
              running={Boolean(isWorking)}
              display="clock"
              className="text-5xl font-semibold tabular-nums text-foreground"
            />
            {isOnBreak && <p className="text-xs font-medium text-muted-foreground">Paused for break</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Current Status</p>
            <div className="mt-1">
              {latest ? <AttendanceStatusBadge status={latest.status} /> : <span className="text-sm text-foreground">Not Started</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Check In</p>
            <p className="mt-1 text-sm text-foreground">{firstCheckIn ? format(new Date(firstCheckIn), "MMM d, yyyy '•' h:mm a") : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Break Time</p>
            <LiveDuration
              baseSeconds={bankedBreakSeconds}
              segmentStartedAt={currentSegmentStartedAt}
              running={Boolean(isOnBreak)}
              display="duration"
              className="mt-1 block text-sm font-medium tabular-nums text-foreground"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Worked Time Today</p>
            <LiveDuration
              baseSeconds={bankedWorkedSeconds}
              segmentStartedAt={currentSegmentStartedAt}
              running={Boolean(isWorking)}
              display="duration"
              className="mt-1 block text-sm font-medium tabular-nums text-foreground"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sessions Today</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {realSessions.length === 1 ? "1 Session" : `${realSessions.length} Sessions`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {!isLive && (
            <Button type="button" size="sm" onClick={() => run(startWork)} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Play className="size-3.5" data-icon="inline-start" />}
              {realSessions.length === 0 ? "Start Work" : "Start New Session"}
            </Button>
          )}

          {isWorking && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => run(startBreak)} disabled={isPending}>
                <Coffee className="size-3.5" data-icon="inline-start" />
                Start Break
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => run(endWork)} disabled={isPending}>
                <Square className="size-3.5" data-icon="inline-start" />
                End Work
              </Button>
            </>
          )}

          {isOnBreak && (
            <>
              <Button type="button" size="sm" onClick={() => run(resumeWork)} disabled={isPending}>
                <Play className="size-3.5" data-icon="inline-start" />
                Resume Work
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => run(endWork)} disabled={isPending}>
                <Square className="size-3.5" data-icon="inline-start" />
                End Work
              </Button>
            </>
          )}

          {latest?.status === "auto_closed" && !isLive && (
            <p className="text-sm text-muted-foreground">Your last session was automatically closed at the cutoff time.</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </SectionCard>
  )
}
