import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { PRODUCTION_JOB_STATUS_LABELS } from "@/types/production"
import type { ProductionJobStatus } from "@/types/production"

const STATUS_TONE: Record<ProductionJobStatus, StatusTone> = {
  queued: "neutral",
  in_progress: "warning",
  quality_check: "info",
  rework: "warning",
  completed: "success",
  on_hold: "neutral",
  cancelled: "danger",
}

interface ProductionStatusBadgeProps {
  status: ProductionJobStatus
  className?: string
}

export function ProductionStatusBadge({ status, className }: ProductionStatusBadgeProps) {
  return <StatusBadge label={PRODUCTION_JOB_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
