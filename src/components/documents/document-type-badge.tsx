import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { DOCUMENT_TYPE_LABELS } from "@/types/document"
import type { DocumentType } from "@/types/document"

const TYPE_TONE: Record<DocumentType, StatusTone> = {
  invoice: "info",
  igi_certificate: "success",
  cad_file: "neutral",
  image: "neutral",
  shipping_label: "warning",
  manufacturer_payment: "info",
  employee_information: "neutral",
  other: "neutral",
}

interface DocumentTypeBadgeProps {
  documentType: DocumentType
  className?: string
}

export function DocumentTypeBadge({ documentType, className }: DocumentTypeBadgeProps) {
  return <StatusBadge label={DOCUMENT_TYPE_LABELS[documentType]} tone={TYPE_TONE[documentType]} className={className} />
}
