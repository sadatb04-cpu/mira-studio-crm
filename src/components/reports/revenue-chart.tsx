"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import type { RevenuePoint } from "@/types/report"

type Granularity = "daily" | "weekly" | "monthly"

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function bucketKey(date: string, granularity: Granularity): string {
  if (granularity === "daily") return date

  const parsed = new Date(date)
  if (granularity === "monthly") {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`
  }

  // weekly: bucket by the Monday of that week
  const day = parsed.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(parsed)
  monday.setDate(parsed.getDate() - diff)
  return monday.toISOString().slice(0, 10)
}

function bucketPoints(points: RevenuePoint[], granularity: Granularity) {
  const byBucket = new Map<string, number>()
  for (const point of points) {
    const key = bucketKey(point.date, granularity)
    byBucket.set(key, (byBucket.get(key) ?? 0) + point.total)
  }
  return Array.from(byBucket.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  )
}

interface RevenueChartProps {
  points: RevenuePoint[]
}

export function RevenueChart({ points }: RevenueChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("daily")

  const bucketed = useMemo(() => bucketPoints(points, granularity), [points, granularity])

  return (
    <SectionCard
      title="Revenue Trend"
      description="Revenue from orders placed in the selected range."
      actions={
        <div className="flex items-center gap-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="xs"
              variant={granularity === option.value ? "secondary" : "ghost"}
              onClick={() => setGranularity(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Button asChild type="button" size="xs" variant="ghost">
            <Link href="/orders">View Orders →</Link>
          </Button>
        </div>
      }
    >
      {bucketed.length === 0 ? (
        <EmptyState title="No revenue in this range" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bucketed} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => format(new Date(value), granularity === "monthly" ? "MMM yyyy" : "MMM d")}
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatCurrency(value)}
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(value) => format(new Date(String(value)), "MMM d, yyyy")}
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}
