"use client"

import { format } from "date-fns"
import { ArrowDown } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { LiveDuration } from "@/components/attendance/live-duration"
import type { AttendanceRecord } from "@/types/attendance"

function formatDateTime(value: string) {
  return format(new Date(value), "MMM d, yyyy '•' h:mm a")
}

interface SessionHistoryListProps {
  sessions: AttendanceRecord[]
}

export function SessionHistoryList({ sessions }: SessionHistoryListProps) {
  const realSessions = sessions.filter((session) => session.status !== "absent")

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
        {realSessions.map((session, index) => (
          <div key={session.id} className={index > 0 ? "border-t border-border pt-4 mt-4" : ""}>
            <p className="mb-2 text-sm font-semibold text-foreground">Session {index + 1}</p>
            <div className="flex flex-col gap-1 text-sm text-foreground">
              <span>{session.checkIn ? formatDateTime(session.checkIn) : "—"}</span>
              <ArrowDown className="size-3.5 text-muted-foreground" />
              <span>{session.checkOut ? formatDateTime(session.checkOut) : "Running..."}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Worked</span>
              <LiveDuration
                baseSeconds={session.totalWorkedSeconds}
                segmentStartedAt={session.currentSegmentStartedAt}
                running={session.status === "working"}
                display="duration"
                className="text-sm font-medium tabular-nums text-foreground"
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
