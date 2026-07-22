"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import type { CustomerGrowthPoint } from "@/types/report"

interface CustomerChartProps {
  points: CustomerGrowthPoint[]
}

export function CustomerChart({ points }: CustomerChartProps) {
  return (
    <SectionCard
      title="Customer Growth"
      description="New customers created in the selected range."
      actions={
        <Button asChild type="button" size="xs" variant="ghost">
          <Link href="/customers">View Customers →</Link>
        </Button>
      }
    >
      {points.length === 0 ? (
        <EmptyState title="No new customers in this range" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => format(new Date(value), "MMM d")}
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
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
                labelFormatter={(value) => format(new Date(String(value)), "MMM d, yyyy")}
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-chart-2)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}
