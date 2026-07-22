import { StatusBadge } from "@/components/shared/status-badge"

interface CustomerStatusBadgeProps {
  isActive: boolean
  className?: string
}

export function CustomerStatusBadge({ isActive, className }: CustomerStatusBadgeProps) {
  return (
    <StatusBadge
      label={isActive ? "Active" : "Inactive"}
      tone={isActive ? "success" : "neutral"}
      className={className}
    />
  )
}
