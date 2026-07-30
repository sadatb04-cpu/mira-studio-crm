import type { AttendanceStatus } from "@/types/attendance"

export const ACTIVITY_STATUSES = ["pending", "in_progress", "completed"] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
}

// Pending -> Gray, In Progress -> Orange, Completed -> Green, per the brief.
// Reuses the app's existing status-tone tokens: "neutral" reads as gray,
// "warning" as orange/amber, "success" as green - no new colors invented.
export const ACTIVITY_STATUS_TONE: Record<ActivityStatus, "neutral" | "warning" | "success"> = {
  pending: "neutral",
  in_progress: "warning",
  completed: "success",
}

export interface DailyActivity {
  id: string
  employeeId: string
  employeeName: string
  attendanceId: string | null
  activityTitle: string
  description: string | null
  notes: string | null
  status: ActivityStatus
  startedAt: string | null
  completedAt: string | null
  durationMinutes: number | null
  activityDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  activityTitle: string
  description?: string
}

// Returned instead of creating anything when the employee already has an
// in-progress activity - the client shows a modal offering to finish the
// current one and start the new one, or cancel. No pause/resume: only one
// activity can ever be running at a time.
export interface ActivityConflict {
  activityId: string
  activityTitle: string
  startedAt: string
}

export interface UpdateActivityInput {
  activityTitle?: string
  description?: string
  notes?: string
}

export interface ActivitySummary {
  total: number
  completed: number
  pending: number
  inProgress: number
  totalProductiveMinutes: number
  averageDurationMinutes: number
}

export interface ActivityTimelineEvent {
  time: string
  label: string
}

export interface ManagerActivityOverviewEntry {
  employeeId: string
  employeeName: string
  checkInTime: string | null
  attendanceStatus: AttendanceStatus | null
  currentActivityTitle: string | null
  currentActivityStartedAt: string | null
  completedToday: number
  pendingToday: number
}

export interface ActivityLogFilters {
  employeeId?: string
  status?: ActivityStatus
  search?: string
  from?: string
  to?: string
}

export interface ActivityInsights {
  totalActivities: number
  averageCompletionMinutes: number
  mostCommonActivities: { title: string; count: number }[]
}

// "49 minutes" under an hour, "1h 12m" once it crosses one - matches the
// brief's own examples for both cases.
export function formatActivityDuration(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "—"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${String(remainder).padStart(2, "0")}m`
}
