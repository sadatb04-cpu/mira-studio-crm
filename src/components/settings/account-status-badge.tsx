import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { ACCOUNT_STATUS_LABELS } from "@/types/user-account"
import type { AccountStatus } from "@/types/user-account"

const STATUS_TONE: Record<AccountStatus, StatusTone> = {
  active: "success",
  suspended: "warning",
  disabled: "danger",
  pending_invite: "info",
}

interface AccountStatusBadgeProps {
  status: AccountStatus
  className?: string
}

export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  return <StatusBadge label={ACCOUNT_STATUS_LABELS[status]} tone={STATUS_TONE[status]} className={className} />
}
