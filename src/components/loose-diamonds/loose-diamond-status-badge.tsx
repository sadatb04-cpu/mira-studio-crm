import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { LOOSE_DIAMOND_STATUS_LABELS } from "@/types/loose-diamond"
import type { LooseDiamondStatus } from "@/types/loose-diamond"

const STATUS_TONE: Record<LooseDiamondStatus, StatusTone> = {
  available: "success",
  reserved: "warning",
  sold: "neutral",
  on_memo: "info",
}

interface LooseDiamondStatusBadgeProps {
  status: LooseDiamondStatus
  className?: string
}

export function LooseDiamondStatusBadge({ status, className }: LooseDiamondStatusBadgeProps) {
  return <StatusBadge label={LOOSE_DIAMOND_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
