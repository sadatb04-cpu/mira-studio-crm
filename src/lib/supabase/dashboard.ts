import type { SupabaseClient } from "@supabase/supabase-js"

import { getInventoryDashboardStats } from "@/lib/supabase/inventory-shared"
import type { InventoryDashboardStats } from "@/lib/supabase/inventory-shared"
import { getLowStockJewelryItems } from "@/lib/supabase/jewelry"
import { getTasks } from "@/lib/supabase/tasks"
import {
  getCustomerGrowth,
  getDashboardStats,
  getEmployeeWorkload,
  getOrdersByStatus,
  getProductionByStatus,
  getRecentActivity,
  getRevenueTrend,
  getTaskCompletion,
} from "@/lib/supabase/reports"
import type { CustomerGrowthPoint, DashboardStats, EmployeeWorkload, OrdersByStatus, ProductionByStatus, ReportDateRange, RevenuePoint, TaskCompletionPoint, ActivityItem } from "@/types/report"
import type { OrderListItem } from "@/types/order"
import type { TaskListItem } from "@/types/task"
import type { CustomerListItem } from "@/types/customer"
import type { LowStockJewelryItem } from "@/types/jewelry"

export interface DashboardRevenue {
  points: RevenuePoint[]
}

export interface DashboardOrders {
  byStatus: OrdersByStatus[]
}

export interface DashboardProduction {
  byStatus: ProductionByStatus[]
}

export async function getDashboardRevenue(supabase: SupabaseClient, range: ReportDateRange): Promise<DashboardRevenue> {
  const points = await getRevenueTrend(supabase, range)
  return { points }
}

export async function getDashboardOrders(supabase: SupabaseClient, range: ReportDateRange): Promise<DashboardOrders> {
  const byStatus = await getOrdersByStatus(supabase, range)
  return { byStatus }
}

export async function getDashboardProduction(
  supabase: SupabaseClient,
  range: ReportDateRange
): Promise<DashboardProduction> {
  const byStatus = await getProductionByStatus(supabase, range)
  return { byStatus }
}

// Snapshot, not date-ranged - current jewelry stock levels (loose diamonds
// have no quantity/reorder-level concept, so "low stock" only applies here).
export async function getDashboardInventoryAlerts(supabase: SupabaseClient): Promise<LowStockJewelryItem[]> {
  return getLowStockJewelryItems(supabase)
}

// Reuses tasks.ts's existing "due_today" filter - not a new query concept.
export async function getDashboardTasks(supabase: SupabaseClient): Promise<TaskListItem[]> {
  return getTasks(supabase, { dueFilter: "due_today" })
}

// No existing function sorts by nearest due date - the closest thing
// (getOrders' overdue filter) is for *past* due dates, not upcoming ones.
export async function getDashboardUpcomingOrders(supabase: SupabaseClient, limit = 8): Promise<OrderListItem[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, order_date, due_date, total, currency, created_at, customer:customers(full_name), order_items(count)"
    )
    .not("due_date", "is", null)
    .gte("due_date", new Date().toISOString().slice(0, 10))
    .not("status", "in", "(delivered,completed,cancelled)")
    .order("due_date", { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as OrderListItem[]
}

// Unlike customers.ts's getCustomers() (which the Customers list page needs
// unbounded, for arbitrary filtering), this only ever needs the newest N -
// so it limits the customers query itself, then only fetches orders for
// those N customers, rather than fetching every customer and every order
// company-wide just to show 8 rows.
export async function getDashboardCustomers(supabase: SupabaseClient, limit = 8): Promise<CustomerListItem[]> {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, full_name, company_name, email, phone, country, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const customerIds = (customers ?? []).map((customer) => customer.id)

  const { data: orders, error: ordersError } =
    customerIds.length > 0
      ? await supabase.from("orders").select("customer_id, total, order_date").in("customer_id", customerIds)
      : { data: [] as { customer_id: string; total: number; order_date: string }[], error: null }

  if (ordersError) throw ordersError

  const statsByCustomer = new Map<string, { count: number; total: number; lastDate: string | null }>()
  for (const order of orders ?? []) {
    const existing = statsByCustomer.get(order.customer_id) ?? { count: 0, total: 0, lastDate: null }
    existing.count += 1
    existing.total += order.total
    if (!existing.lastDate || order.order_date > existing.lastDate) {
      existing.lastDate = order.order_date
    }
    statsByCustomer.set(order.customer_id, existing)
  }

  return (customers ?? []).map((customer) => {
    const stats = statsByCustomer.get(customer.id) ?? { count: 0, total: 0, lastDate: null }
    return {
      ...customer,
      totalOrders: stats.count,
      lifetimeSpend: stats.total,
      lastOrderDate: stats.lastDate,
    }
  })
}

export async function getDashboardEmployeeWorkload(supabase: SupabaseClient): Promise<EmployeeWorkload[]> {
  return getEmployeeWorkload(supabase)
}

export async function getDashboardActivity(supabase: SupabaseClient, limit = 12): Promise<ActivityItem[]> {
  return getRecentActivity(supabase, limit)
}

export interface ExecutiveDashboardData {
  stats: DashboardStats
  inventoryStats: InventoryDashboardStats
  revenue: RevenuePoint[]
  orders: OrdersByStatus[]
  production: ProductionByStatus[]
  customerGrowth: CustomerGrowthPoint[]
  taskCompletion: TaskCompletionPoint[]
  inventoryAlerts: LowStockJewelryItem[]
  todaysTasks: TaskListItem[]
  upcomingOrders: OrderListItem[]
  recentCustomers: CustomerListItem[]
  employeeWorkload: EmployeeWorkload[]
  recentActivity: ActivityItem[]
}

// The single entry point the dashboard page calls - orchestrates every
// section's data in one Promise.all so nothing is fetched twice (in
// particular, getDashboardStats() and getInventoryDashboardStats() are each
// called exactly once here, not once per KPI card).
export async function getExecutiveDashboard(
  supabase: SupabaseClient,
  range: ReportDateRange
): Promise<ExecutiveDashboardData> {
  const [
    stats,
    inventoryStats,
    revenueData,
    ordersData,
    productionData,
    customerGrowth,
    taskCompletion,
    inventoryAlerts,
    todaysTasks,
    upcomingOrders,
    recentCustomers,
    employeeWorkload,
    recentActivity,
  ] = await Promise.all([
    getDashboardStats(supabase, range),
    getInventoryDashboardStats(supabase),
    getDashboardRevenue(supabase, range),
    getDashboardOrders(supabase, range),
    getDashboardProduction(supabase, range),
    getCustomerGrowth(supabase, range),
    getTaskCompletion(supabase, range),
    getDashboardInventoryAlerts(supabase),
    getDashboardTasks(supabase),
    getDashboardUpcomingOrders(supabase),
    getDashboardCustomers(supabase),
    getDashboardEmployeeWorkload(supabase),
    getDashboardActivity(supabase),
  ])

  return {
    stats,
    inventoryStats,
    revenue: revenueData.points,
    orders: ordersData.byStatus,
    production: productionData.byStatus,
    customerGrowth,
    taskCompletion,
    inventoryAlerts,
    todaysTasks,
    upcomingOrders,
    recentCustomers,
    employeeWorkload,
    recentActivity,
  }
}
