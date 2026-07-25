"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ArrowDown } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDuration } from "@/types/attendance"
import type { AttendanceRecord } from "@/types/attendance"

function formatDateTime(value: string) {
  return format(new Date(value), "MMM d, yyyy '•' h:mm a")
}

interface SessionHistoryListProps {
  sessions: AttendanceRecord[]
}

export function SessionHistoryList({ sessions }: SessionHistoryListProps) {
  const realSessions = sessions.filter((session) => session.status !== "absent")

  // Live totals re-render every second so a still-running session's
  // "Worked" figure keeps up with the prominent timer above it, without
  // needing its own separate polling loop.
  const [now, setNow] = useState(() => Date.now())
  const hasRunningSession = realSessions.some((session) => session.status === "working" || session.status === "on_break")

  useEffect(() => {
    if (!hasRunningSession) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [hasRunningSession])

  if (realSessions.length === 0) {
    return (
      <SectionCard title="Today's Sessions">
        <EmptyState title="No sessions yet today" description="Start work to begin your first session." />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Today's Sessions">
      <div className="flex flex-col">
        {realSessions.map((session, index) => {
          const isRunning = session.status === "working" || session.status === "on_break"
          const segmentElapsed =
            isRunning && session.currentSegmentStartedAt
              ? Math.max(0, Math.floor((now - new Date(session.currentSegmentStartedAt).getTime()) / 1000))
              : 0
          const workedSeconds = session.totalWorkedSeconds + (session.status === "working" ? segmentElapsed : 0)

          return (
            <div key={session.id} className={index > 0 ? "border-t border-border pt-4 mt-4" : ""}>
              <p className="mb-2 text-sm font-semibold text-foreground">Session {index + 1}</p>
              <div className="flex flex-col gap-1 text-sm text-foreground">
                <span>{session.checkIn ? formatDateTime(session.checkIn) : "—"}</span>
                <ArrowDown className="size-3.5 text-muted-foreground" />
                <span>{session.checkOut ? formatDateTime(session.checkOut) : "Running..."}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Worked</span>
                <span className="text-sm font-medium tabular-nums text-foreground">{formatDuration(workedSeconds)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
