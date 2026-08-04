import type { SupabaseClient } from "@supabase/supabase-js"

import { getInventoryDashboardStats } from "@/lib/supabase/inventory-shared"
import { getCustomersDashboardStats } from "@/lib/supabase/customers"
import { getEmployeeDashboardStats } from "@/lib/supabase/employees"
import { getSellerRevenueStats, getSellerRevenueTrend } from "@/lib/supabase/finance-sellers"
import { ORDER_STATUSES } from "@/types/order"
import { PRODUCTION_JOB_STATUSES } from "@/types/production"
import { TASK_STATUSES } from "@/types/task"
import type {
  ActivityItem,
  CustomerGrowthPoint,
  DashboardStats,
  DateRangePreset,
  EmployeeWorkload,
  OrdersByStatus,
  ProductionByStatus,
  ReportDateRange,
  RevenuePoint,
  TaskCompletionPoint,
  TrendKpi,
} from "@/types/report"

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Resolves a preset (or custom from/to) into a concrete date range. */
export function resolveDateRange(preset: DateRangePreset, customFrom?: string, customTo?: string): ReportDateRange {
  const today = new Date()
  const to = customTo ?? toDateString(today)

  if (preset === "custom") {
    return { from: customFrom ?? to, to }
  }

  if (preset === "today") {
    return { from: to, to }
  }

  if (preset === "year") {
    return { from: `${today.getFullYear()}-01-01`, to }
  }

  if (preset === "12m") {
    const from = new Date(today)
    from.setDate(from.getDate() - 365)
    return { from: toDateString(from), to }
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
  const from = new Date(today)
  from.setDate(from.getDate() - days)

  return { from: toDateString(from), to }
}

/** Same-length period immediately preceding `range`, for comparison KPIs. */
export function getPreviousRange(range: ReportDateRange): ReportDateRange {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const durationMs = to.getTime() - from.getTime()

  const previousTo = new Date(from.getTime() - 86400000)
  const previousFrom = new Date(previousTo.getTime() - durationMs)

  return {
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10),
  }
}

function buildTrendKpi(current: number, previous: number): TrendKpi {
  return {
    value: current,
    previousValue: previous,
    changePercent: previous > 0 ? ((current - previous) / previous) * 100 : null,
  }
}

export async function getDashboardStats(supabase: SupabaseClient, range: ReportDateRange): Promise<DashboardStats> {
  const previous = getPreviousRange(range)

  const [
    revenueCurrent,
    revenuePrevious,
    ordersCreatedCurrentResult,
    ordersCreatedPreviousResult,
    deliveredResult,
    productionCurrentResult,
    productionPreviousResult,
    inventoryStats,
    customerStats,
    employeeStats,
    openTasksResult,
  ] = await Promise.all([
    // Revenue/COGS/Gross Profit come from Finance -> Sellers, not
    // orders.total (orders carries no reliable price data, and this app
    // deliberately doesn't require duplicating pricing into Orders just to
    // feed the Dashboard) - see finance-sellers.ts's getSellerRevenueStats().
    getSellerRevenueStats(supabase, range),
    getSellerRevenueStats(supabase, previous),
    // "Orders Created" is a pure count of orders placed, independent of
    // revenue - head:true skips transferring any rows at all.
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("order_date", range.from).lte("order_date", range.to),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("order_date", previous.from).lte("order_date", previous.to),
    // Snapshot, not date-ranged - orders has no delivered_at column, so this
    // intentionally reflects current state rather than approximating via
    // updated_at (which changes on any edit, not just delivery). Only the
    // count is needed, so head:true skips transferring any rows at all.
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("production_jobs").select("*", { count: "exact", head: true }).gte("created_at", range.from).lte("created_at", range.to),
    supabase
      .from("production_jobs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", previous.from)
      .lte("created_at", previous.to),
    getInventoryDashboardStats(supabase),
    getCustomersDashboardStats(supabase),
    getEmployeeDashboardStats(supabase),
    // Same head:true count pattern - "open" is defined as todo/in_progress/
    // blocked, filtered server-side rather than fetching every task's status.
    supabase.from("tasks").select("*", { count: "exact", head: true }).in("status", ["todo", "in_progress", "blocked"]),
  ])

  if (ordersCreatedCurrentResult.error) throw ordersCreatedCurrentResult.error
  if (ordersCreatedPreviousResult.error) throw ordersCreatedPreviousResult.error
  if (deliveredResult.error) throw deliveredResult.error
  if (productionCurrentResult.error) throw productionCurrentResult.error
  if (productionPreviousResult.error) throw productionPreviousResult.error
  if (openTasksResult.error) throw openTasksResult.error

  return {
    totalRevenue: buildTrendKpi(revenueCurrent.revenue, revenuePrevious.revenue),
    totalCOGS: buildTrendKpi(revenueCurrent.cogs, revenuePrevious.cogs),
    grossProfit: buildTrendKpi(revenueCurrent.grossProfit, revenuePrevious.grossProfit),
    ordersCreated: buildTrendKpi(ordersCreatedCurrentResult.count ?? 0, ordersCreatedPreviousResult.count ?? 0),
    ordersDelivered: { value: deliveredResult.count ?? 0 },
    productionJobs: buildTrendKpi(productionCurrentResult.count ?? 0, productionPreviousResult.count ?? 0),
    inventoryValue: { value: inventoryStats.totalInventoryValue },
    activeCustomers: { value: customerStats.activeCustomers },
    activeEmployees: { value: employeeStats.active },
    openTasks: { value: openTasksResult.count ?? 0 },
  }
}

// Delegates entirely to the Finance module (see finance-sellers.ts's
// getSellerRevenueTrend()) rather than re-deriving revenue from orders.total
// here - this is the same function backing the Revenue Trend chart on both
// Dashboard and Reports, so they can never show different numbers for the
// same range.
export async function getRevenueTrend(supabase: SupabaseClient, range: ReportDateRange): Promise<RevenuePoint[]> {
  return getSellerRevenueTrend(supabase, range)
}

export async function getOrdersByStatus(supabase: SupabaseClient, range: ReportDateRange): Promise<OrdersByStatus[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("status")
    .gte("order_date", range.from)
    .lte("order_date", range.to)

  if (error) throw error

  const rows = data ?? []
  return ORDER_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }))
}

export async function getProductionByStatus(
  supabase: SupabaseClient,
  range: ReportDateRange
): Promise<ProductionByStatus[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("status")
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  if (error) throw error

  const rows = data ?? []
  return PRODUCTION_JOB_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }))
}

export async function getCustomerGrowth(
  supabase: SupabaseClient,
  range: ReportDateRange
): Promise<CustomerGrowthPoint[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("created_at")
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  if (error) throw error

  const byDate = new Map<string, number>()
  for (const row of data ?? []) {
    const date = (row.created_at as string).slice(0, 10)
    byDate.set(date, (byDate.get(date) ?? 0) + 1)
  }

  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTaskCompletion(
  supabase: SupabaseClient,
  range: ReportDateRange
): Promise<TaskCompletionPoint[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("status")
    .gte("created_at", range.from)
    .lte("created_at", range.to)

  if (error) throw error

  const rows = data ?? []
  return TASK_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }))
}

// Snapshot, not date-ranged - current workload, org-wide (a new aggregate;
// employees.ts only computes this per-employee, not across all employees).
export async function getEmployeeWorkload(supabase: SupabaseClient): Promise<EmployeeWorkload[]> {
  // assigned_to references profiles(id), so only employees linked to a
  // CRM account (user_id) can have any workload at all - an unlinked
  // employee could never appear in either assignment table.
  const [employeesResult, jobsResult, tasksResult] = await Promise.all([
    supabase.from("employees").select("user_id, full_name").eq("employment_status", "active").not("user_id", "is", null),
    supabase.from("production_jobs").select("assigned_to").not("assigned_to", "is", null),
    supabase.from("tasks").select("assigned_to").not("assigned_to", "is", null),
  ])

  if (employeesResult.error) throw employeesResult.error
  if (jobsResult.error) throw jobsResult.error
  if (tasksResult.error) throw tasksResult.error

  const jobCounts = new Map<string, number>()
  for (const row of jobsResult.data ?? []) {
    const key = row.assigned_to as string
    jobCounts.set(key, (jobCounts.get(key) ?? 0) + 1)
  }

  const taskCounts = new Map<string, number>()
  for (const row of tasksResult.data ?? []) {
    const key = row.assigned_to as string
    taskCounts.set(key, (taskCounts.get(key) ?? 0) + 1)
  }

  return (employeesResult.data ?? [])
    .map((employee) => {
      const userId = employee.user_id as string
      return {
        employeeId: userId,
        name: employee.full_name as string,
        jobCount: jobCounts.get(userId) ?? 0,
        taskCount: taskCounts.get(userId) ?? 0,
      }
    })
    .sort((a, b) => b.jobCount + b.taskCount - (a.jobCount + a.taskCount))
}

const ACTIVITY_ENTITY_LABEL_QUERIES: Record<string, { table: string; idColumn: string; labelColumn: string }> = {
  order: { table: "orders", idColumn: "id", labelColumn: "order_number" },
  production_job: { table: "production_jobs", idColumn: "id", labelColumn: "job_number" },
  task: { table: "tasks", idColumn: "id", labelColumn: "title" },
  customer: { table: "customers", idColumn: "id", labelColumn: "full_name" },
  employee: { table: "profiles", idColumn: "id", labelColumn: "full_name" },
}

export async function getRecentActivity(supabase: SupabaseClient, limit = 20): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, entity_type, entity_id, action, description, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = data ?? []

  const actorIds = [...new Set(rows.filter((row) => row.actor_id).map((row) => row.actor_id as string))]
  const actorsResult =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
      : { data: [] as { id: string; full_name: string }[], error: null }

  if (actorsResult.error) throw actorsResult.error
  const actorMap = new Map((actorsResult.data ?? []).map((actor) => [actor.id, actor.full_name]))

  const idsByType = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.entity_id) continue
    const list = idsByType.get(row.entity_type) ?? []
    list.push(row.entity_id)
    idsByType.set(row.entity_type, list)
  }

  const labelMap = new Map<string, string>()

  await Promise.all(
    Array.from(idsByType.entries()).map(async ([entityType, ids]) => {
      const config = ACTIVITY_ENTITY_LABEL_QUERIES[entityType]
      if (!config) return

      const uniqueIds = [...new Set(ids)]
      const { data: labelRows, error: labelError } = await supabase
        .from(config.table)
        .select(`${config.idColumn}, ${config.labelColumn}`)
        .in(config.idColumn, uniqueIds)

      if (labelError) throw labelError

      for (const row of labelRows ?? []) {
        const rowRecord = row as unknown as Record<string, string>
        labelMap.set(`${entityType}:${rowRecord[config.idColumn]}`, rowRecord[config.labelColumn])
      }
    })
  )

  return rows.map((row) => ({
    id: row.id as string,
    action: row.action as string,
    description: row.description as string | null,
    created_at: row.created_at as string,
    entityType: row.entity_type as string,
    entityLabel: row.entity_id ? (labelMap.get(`${row.entity_type}:${row.entity_id}`) ?? row.entity_id) : null,
    actorName: row.actor_id ? (actorMap.get(row.actor_id as string) ?? null) : null,
  }))
}

export async function exportReportCsv(supabase: SupabaseClient, range: ReportDateRange): Promise<string> {
  // Reuses getDashboardStats() entirely rather than re-deriving the same
  // aggregates - the CSV is a formatted view of the same numbers shown on
  // screen for this date range.
  const stats = await getDashboardStats(supabase, range)

  const lines = [
    "Mira Operations - Report Export",
    `Date Range,${range.from} to ${range.to}`,
    "",
    "Metric,Value",
    `Total Revenue,${stats.totalRevenue.value}`,
    `Total COGS,${stats.totalCOGS.value}`,
    `Gross Profit,${stats.grossProfit.value}`,
    `Orders Created,${stats.ordersCreated.value}`,
    `Orders Delivered (current),${stats.ordersDelivered.value}`,
    `Production Jobs,${stats.productionJobs.value}`,
    `Inventory Value (current),${stats.inventoryValue.value}`,
    `Active Customers (current),${stats.activeCustomers.value}`,
    `Active Employees (current),${stats.activeEmployees.value}`,
    `Open Tasks (current),${stats.openTasks.value}`,
  ]

  return lines.join("\n")
}
