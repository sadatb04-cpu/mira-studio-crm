import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "pending"

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
  className?: string
}

const TONE_TO_VARIANT: Record<StatusTone, "outline" | "info" | "success" | "warning" | "destructive" | "pending"> = {
  neutral: "outline",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
  pending: "pending",
}

const TONE_TO_DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  pending: "bg-pending",
}

function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <Badge variant={TONE_TO_VARIANT[tone]} className={className}>
      <span className={cn("size-1.5 rounded-full", TONE_TO_DOT_CLASS[tone])} aria-hidden="true" />
      {label}
    </Badge>
  )
}

export { StatusBadge }
export type { StatusBadgeProps, StatusTone }
