import type { LucideIcon } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { SnapshotKpi, TrendKpi } from "@/types/report"

function isTrendKpi(kpi: TrendKpi | SnapshotKpi): kpi is TrendKpi {
  return "changePercent" in kpi
}

interface ReportSummaryCardProps {
  label: string
  kpi: TrendKpi | SnapshotKpi | null
  icon?: LucideIcon
  formatValue?: (value: number) => string
  isLoading?: boolean
  className?: string
}

export function ReportSummaryCard({
  label,
  kpi,
  icon,
  formatValue = (value) => String(value),
  isLoading,
  className,
}: ReportSummaryCardProps) {
  if (isLoading) {
    return <StatCard label={label} value="" icon={icon} isLoading className={className} />
  }

  if (!kpi) {
    return <StatCard label={label} value="No data" icon={icon} className={className} />
  }

  const trend =
    isTrendKpi(kpi) && kpi.changePercent !== null
      ? {
          value: `${kpi.changePercent >= 0 ? "+" : ""}${kpi.changePercent.toFixed(1)}% vs prior period`,
          direction: (kpi.changePercent > 0 ? "up" : kpi.changePercent < 0 ? "down" : "neutral") as
            | "up"
            | "down"
            | "neutral",
        }
      : undefined

  return (
    <StatCard label={label} value={formatValue(kpi.value)} icon={icon} trend={trend} className={className} />
  )
}
