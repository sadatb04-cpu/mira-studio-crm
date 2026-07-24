export const ATTENDANCE_STATUSES = ["working", "on_break", "finished", "absent", "auto_closed"] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  working: "Working",
  on_break: "On Break",
  finished: "Finished",
  absent: "Absent",
  auto_closed: "Auto Closed",
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  status: AttendanceStatus
  checkIn: string | null
  checkOut: string | null
  totalWorkedSeconds: number
  totalBreakSeconds: number
  currentSegmentStartedAt: string | null
  notes: string | null
}

export interface AttendanceDashboardSummary {
  working: number
  onBreak: number
  finished: number
  absent: number
  autoClosed: number
}

export interface AttendanceEmployeeOption {
  id: string
  name: string
}

export interface AttendanceHistoryFilters {
  employeeId?: string
  status?: AttendanceStatus
  from?: string
  to?: string
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}
