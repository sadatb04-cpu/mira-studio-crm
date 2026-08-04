import type { OrderStatus } from "@/types/order"
import type { ProductionJobStatus } from "@/types/production"
import type { TaskStatus } from "@/types/task"

export const DATE_RANGE_PRESETS = ["today", "7d", "30d", "90d", "year", "12m", "custom"] as const
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  year: "This Year",
  "12m": "Last 12 Months",
  custom: "Custom",
}

/** Presets shown on the Executive Dashboard's date range filter (excludes "year" - This Year - which is Reports-specific). */
export const DASHBOARD_DATE_RANGE_PRESETS: DateRangePreset[] = ["today", "7d", "30d", "90d", "12m", "custom"]

export interface ReportDateRange {
  from: string
  to: string
}

/** A KPI that supports a period-over-period comparison. */
export interface TrendKpi {
  value: number
  previousValue: number
  changePercent: number | null
}

/** A KPI that represents current state, not scoped to the date range. */
export interface SnapshotKpi {
  value: number
}

export interface DashboardStats {
  /** SUM(selling_price) from Finance -> Sellers invoices in range - see finance-sellers.ts's getSellerRevenueStats(). */
  totalRevenue: TrendKpi
  /** SUM(manufacturing_price) from the same Seller invoices. */
  totalCOGS: TrendKpi
  /** SUM(profit) from the same Seller invoices - profit is a DB-generated column (selling_price - manufacturing_price), never re-derived here. */
  grossProfit: TrendKpi
  ordersCreated: TrendKpi
  ordersDelivered: SnapshotKpi
  productionJobs: TrendKpi
  inventoryValue: SnapshotKpi
  activeCustomers: SnapshotKpi
  activeEmployees: SnapshotKpi
  openTasks: SnapshotKpi
}

export interface RevenuePoint {
  date: string
  total: number
}

export interface OrdersByStatus {
  status: OrderStatus
  count: number
}

export interface ProductionByStatus {
  status: ProductionJobStatus
  count: number
}

// category is now a plain string (jewelry category, or "Loose Diamonds") -
// the old fixed InventoryCategory enum (Gold/Gemstone/Finding/etc) belonged
// to the deprecated inventory_items schema.
export interface InventoryByCategory {
  category: string
  value: number
}

export interface CustomerGrowthPoint {
  date: string
  count: number
}

export interface TaskCompletionPoint {
  status: TaskStatus
  count: number
}

export interface EmployeeWorkload {
  employeeId: string
  name: string
  jobCount: number
  taskCount: number
}

export interface ActivityItem {
  id: string
  action: string
  description: string | null
  created_at: string
  entityType: string
  entityLabel: string | null
  actorName: string | null
}
