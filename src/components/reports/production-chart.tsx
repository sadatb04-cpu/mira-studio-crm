"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { PRODUCTION_JOB_STATUS_LABELS } from "@/types/production"
import type { ProductionByStatus } from "@/types/report"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
]

interface ProductionChartProps {
  data: ProductionByStatus[]
}

export function ProductionChart({ data }: ProductionChartProps) {
  const chartData = data.map((row) => ({ label: PRODUCTION_JOB_STATUS_LABELS[row.status], count: row.count }))
  const hasData = chartData.some((row) => row.count > 0)

  return (
    <SectionCard
      title="Production Status"
      description="Production jobs created in the selected range."
      actions={
        <Button asChild type="button" size="xs" variant="ghost">
          <Link href="/production">View Production →</Link>
        </Button>
      }
    >
      {!hasData ? (
        <EmptyState title="No production jobs in this range" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((row, index) => (
                  <Cell key={row.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}
