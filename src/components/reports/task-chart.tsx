"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { TASK_STATUS_LABELS } from "@/types/task"
import type { TaskCompletionPoint } from "@/types/report"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

interface TaskChartProps {
  data: TaskCompletionPoint[]
}

export function TaskChart({ data }: TaskChartProps) {
  const chartData = data.map((row) => ({ label: TASK_STATUS_LABELS[row.status], count: row.count }))
  const hasData = chartData.some((row) => row.count > 0)

  return (
    <SectionCard
      title="Task Completion"
      description="Tasks created in the selected range, by status."
      actions={
        <Button asChild type="button" size="xs" variant="ghost">
          <Link href="/tasks">View Tasks →</Link>
        </Button>
      }
    >
      {!hasData ? (
        <EmptyState title="No tasks in this range" />
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
