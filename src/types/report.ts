import type { OrderStatus } from "@/types/order"
import type { ProductionJobStatus } from "@/types/production"
import type { InventoryCategory } from "@/types/inventory"
import type { TaskStatus } from "@/types/task"

export const DATE_RANGE_PRESETS = ["today", "7d", "30d", "90d", "year", "custom"] as const
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  year: "This Year",
  custom: "Custom",
}

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
  totalRevenue: TrendKpi
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

export interface InventoryByCategory {
  category: InventoryCategory
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
