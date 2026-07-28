"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Clock3 } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { ATTENDANCE_STATUS_LABELS } from "@/types/attendance"
import type { ManagerActivityOverviewEntry } from "@/types/daily-activity"

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  working: "success",
  on_break: "warning",
  finished: "neutral",
  absent: "danger",
  auto_closed: "neutral",
}

function formatTime(value: string | null): string {
  return value ? format(new Date(value), "h:mm a") : "—"
}

function formatElapsed(minutesSinceStart: number | null): string {
  if (minutesSinceStart === null) return "—"
  const hours = Math.floor(minutesSinceStart / 60)
  const minutes = minutesSinceStart % 60
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`
}

interface ManagerActivityOverviewProps {
  entries: ManagerActivityOverviewEntry[]
}

export function ManagerActivityOverview({ entries }: ManagerActivityOverviewProps) {
  // Starts null so the first client render matches the server-rendered
  // output exactly - see attendance-timer-widget.tsx for why seeding this
  // from Date.now() during render would cause a hydration mismatch.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  if (entries.length === 0) {
    return <EmptyState icon={Clock3} title="No one has checked in yet" description="Employee activity will appear here once they check in for the day." />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => {
        const elapsedMinutes =
          entry.currentActivityStartedAt && now !== null
            ? Math.max(0, Math.round((now - new Date(entry.currentActivityStartedAt).getTime()) / 60000))
            : null

        return (
          <div key={entry.employeeId} className="glass-surface-soft flex flex-col gap-3 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{entry.employeeName}</p>
              {entry.attendanceStatus && (
                <StatusBadge
                  label={ATTENDANCE_STATUS_LABELS[entry.attendanceStatus]}
                  tone={STATUS_TONE[entry.attendanceStatus] ?? "neutral"}
                />
              )}
            </div>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Checked In <span className="font-medium text-foreground">{formatTime(entry.checkInTime)}</span>
              </span>
            </div>

            <div className="rounded-xl border border-border p-3">
              {entry.currentActivityTitle ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">Current Activity</p>
                  <p className="text-sm font-medium text-foreground">{entry.currentActivityTitle}</p>
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                    <span>
                      Started <span className="font-medium text-foreground">{formatTime(entry.currentActivityStartedAt)}</span>
                    </span>
                    <span>
                      Elapsed <span className="font-medium text-foreground">{formatElapsed(elapsedMinutes)}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No activity in progress.</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Completed Today <span className="font-semibold text-success">{entry.completedToday}</span>
              </span>
              <span className="text-muted-foreground">
                Pending <span className="font-semibold text-foreground">{entry.pendingToday}</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
