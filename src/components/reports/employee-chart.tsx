"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import type { EmployeeWorkload } from "@/types/report"

interface EmployeeChartProps {
  data: EmployeeWorkload[]
}

export function EmployeeChart({ data }: EmployeeChartProps) {
  // Cap to the busiest 8 so labels stay readable; view all on the Employees page.
  const chartData = data.slice(0, 8).map((row) => ({
    name: row.name,
    "Production Jobs": row.jobCount,
    Tasks: row.taskCount,
  }))

  const hasData = chartData.some((row) => row["Production Jobs"] > 0 || row.Tasks > 0)

  return (
    <SectionCard
      title="Employee Workload"
      description="Current production jobs and tasks assigned per active employee."
      actions={
        <Button asChild type="button" size="xs" variant="ghost">
          <Link href="/employees">View Employees →</Link>
        </Button>
      }
    >
      {!hasData ? (
        <EmptyState title="No active assignments" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Production Jobs" stackId="workload" fill="var(--color-chart-1)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Tasks" stackId="workload" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}
