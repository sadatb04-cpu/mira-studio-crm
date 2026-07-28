import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { JEWELRY_STATUS_LABELS } from "@/types/jewelry"
import type { JewelryStatus } from "@/types/jewelry"

const STATUS_TONE: Record<JewelryStatus, StatusTone> = {
  active: "success",
  reserved: "warning",
  sold: "neutral",
  discontinued: "danger",
}

interface JewelryStatusBadgeProps {
  status: JewelryStatus
  className?: string
}

export function JewelryStatusBadge({ status, className }: JewelryStatusBadgeProps) {
  return <StatusBadge label={JEWELRY_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
