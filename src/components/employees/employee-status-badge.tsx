import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EMPLOYMENT_STATUS_LABELS } from "@/types/employee"
import type { EmploymentStatus } from "@/types/employee"

const STATUS_TONE: Record<EmploymentStatus, StatusTone> = {
  active: "success",
  on_leave: "warning",
  terminated: "danger",
}

interface EmployeeStatusBadgeProps {
  status: EmploymentStatus
  className?: string
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  return <StatusBadge label={EMPLOYMENT_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
