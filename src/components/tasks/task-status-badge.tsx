import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { TASK_STATUS_LABELS } from "@/types/task"
import type { TaskStatus } from "@/types/task"

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  todo: "neutral",
  in_progress: "warning",
  blocked: "danger",
  done: "success",
  cancelled: "neutral",
}

interface TaskStatusBadgeProps {
  status: TaskStatus
  className?: string
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return <StatusBadge label={TASK_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
