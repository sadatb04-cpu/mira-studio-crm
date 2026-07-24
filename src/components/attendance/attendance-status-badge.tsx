import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { ATTENDANCE_STATUS_LABELS } from "@/types/attendance"
import type { AttendanceStatus } from "@/types/attendance"

const STATUS_TONE: Record<AttendanceStatus, StatusTone> = {
  working: "success",
  on_break: "info",
  finished: "neutral",
  absent: "danger",
  auto_closed: "warning",
}

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus
  className?: string
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  return <StatusBadge label={ATTENDANCE_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
