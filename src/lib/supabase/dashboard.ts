import type { SupabaseClient } from "@supabase/supabase-js"

import { getInventoryItems, getInventoryStats } from "@/lib/supabase/inventory"
import { getCustomers } from "@/lib/supabase/customers"
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
import { getStockStatus } from "@/types/inventory"
import type { InventoryItemListItem } from "@/types/inventory"
import type { CustomerGrowthPoint, DashboardStats, EmployeeWorkload, OrdersByStatus, ProductionByStatus, ReportDateRange, RevenuePoint, TaskCompletionPoint, ActivityItem } from "@/types/report"
import type { OrderListItem } from "@/types/order"
import type { TaskListItem } from "@/types/task"
import type { CustomerListItem } from "@/types/customer"
import type { InventoryStats } from "@/types/inventory"

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

// Snapshot, not date-ranged - current stock levels, reusing the same
// getStockStatus() derivation used by the Inventory module itself.
export async function getDashboardInventoryAlerts(supabase: SupabaseClient): Promise<InventoryItemListItem[]> {
  const items = await getInventoryItems(supabase, {})
  return items.filter((item) => getStockStatus(item.quantity_on_hand, item.minimum_stock) !== "in_stock")
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

// Reuses customers.ts's getCustomers(), already sorted newest-first.
export async function getDashboardCustomers(supabase: SupabaseClient, limit = 8): Promise<CustomerListItem[]> {
  const customers = await getCustomers(supabase, {})
  return customers.slice(0, limit)
}

export async function getDashboardEmployeeWorkload(supabase: SupabaseClient): Promise<EmployeeWorkload[]> {
  return getEmployeeWorkload(supabase)
}

export async function getDashboardActivity(supabase: SupabaseClient, limit = 12): Promise<ActivityItem[]> {
  return getRecentActivity(supabase, limit)
}

export interface ExecutiveDashboardData {
  stats: DashboardStats
  inventoryStats: InventoryStats
  revenue: RevenuePoint[]
  orders: OrdersByStatus[]
  production: ProductionByStatus[]
  customerGrowth: CustomerGrowthPoint[]
  taskCompletion: TaskCompletionPoint[]
  inventoryAlerts: InventoryItemListItem[]
  todaysTasks: TaskListItem[]
  upcomingOrders: OrderListItem[]
  recentCustomers: CustomerListItem[]
  employeeWorkload: EmployeeWorkload[]
  recentActivity: ActivityItem[]
}

// The single entry point the dashboard page calls - orchestrates every
// section's data in one Promise.all so nothing is fetched twice (in
// particular, getDashboardStats() and getInventoryStats() are each called
// exactly once here, not once per KPI card).
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
    getInventoryStats(supabase),
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
