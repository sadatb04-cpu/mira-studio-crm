import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardTrend {
  value: string
  direction?: "up" | "down" | "neutral"
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: StatCardTrend
  description?: string
  isLoading?: boolean
  className?: string
}

function StatCard({ label, value, icon: Icon, trend, description, isLoading, className }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </CardContent>
      </Card>
    )
  }

  const TrendIcon =
    trend?.direction === "down" ? ArrowDown : trend?.direction === "neutral" ? ArrowRight : ArrowUp

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && (
          <CardAction>
            <Icon className="size-4 text-muted-foreground" />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {(trend || description) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trend.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                  trend.direction === "down" && "text-destructive",
                  (!trend.direction || trend.direction === "neutral") && "text-muted-foreground"
                )}
              >
                <TrendIcon className="size-3" />
                {trend.value}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StatCard }
export type { StatCardProps, StatCardTrend }
