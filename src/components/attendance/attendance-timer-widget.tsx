"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Coffee, Loader2, Play, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/shared/section-card"
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge"
import { endWork, resumeWork, startBreak, startWork } from "@/app/actions/attendance"
import { formatDuration } from "@/types/attendance"
import type { AttendanceRecord } from "@/types/attendance"

interface AttendanceTimerWidgetProps {
  record: AttendanceRecord | null
}

export function AttendanceTimerWidget({ record }: AttendanceTimerWidgetProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [now, setNow] = useState(() => Date.now())

  const isLive = record?.status === "working" || record?.status === "on_break"

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isLive])

  const segmentElapsedSeconds =
    isLive && record?.currentSegmentStartedAt ? Math.max(0, Math.floor((now - new Date(record.currentSegmentStartedAt).getTime()) / 1000)) : 0

  const currentSessionSeconds = isLive ? segmentElapsedSeconds : null
  const workedSeconds = (record?.totalWorkedSeconds ?? 0) + (record?.status === "working" ? segmentElapsedSeconds : 0)
  const breakSeconds = (record?.totalBreakSeconds ?? 0) + (record?.status === "on_break" ? segmentElapsedSeconds : 0)

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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Current Status</p>
            <div className="mt-1">
              {record ? <AttendanceStatusBadge status={record.status} /> : <span className="text-sm text-foreground">Not Started</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Check In</p>
            <p className="mt-1 text-sm text-foreground">{record?.checkIn ? format(new Date(record.checkIn), "h:mm a") : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Current Session Time</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
              {currentSessionSeconds !== null ? formatDuration(currentSessionSeconds) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Break Time</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-foreground">{formatDuration(breakSeconds)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Worked Time Today</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-foreground">{formatDuration(workedSeconds)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {!record && (
            <Button type="button" size="sm" onClick={() => run(startWork)} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Play className="size-3.5" data-icon="inline-start" />}
              Start Work
            </Button>
          )}

          {record?.status === "working" && (
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

          {record?.status === "on_break" && (
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

          {record?.status === "finished" && <p className="text-sm text-muted-foreground">You&apos;ve ended work for today.</p>}
          {record?.status === "auto_closed" && (
            <p className="text-sm text-muted-foreground">Your session was automatically closed at the cutoff time.</p>
          )}
          {record?.status === "absent" && <p className="text-sm text-muted-foreground">Marked absent - no check-in recorded today.</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </SectionCard>
  )
}
