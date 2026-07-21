import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
  className?: string
}

const TONE_TO_VARIANT: Record<StatusTone, "outline" | "info" | "success" | "warning" | "destructive"> = {
  neutral: "outline",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
}

const TONE_TO_DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
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
