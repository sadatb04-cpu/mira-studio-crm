import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { QUOTATION_STATUS_LABELS } from "@/types/quotation"
import type { QuotationStatus } from "@/types/quotation"

const STATUS_TONE: Record<QuotationStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "danger",
}

interface QuotationStatusBadgeProps {
  status: QuotationStatus
  className?: string
}

export function QuotationStatusBadge({ status, className }: QuotationStatusBadgeProps) {
  return <StatusBadge label={QUOTATION_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
