import { Suspense } from "react"
import Link from "next/link"
import { Briefcase, ClipboardList, DollarSign, Gem, Package, PackageCheck, ShoppingBag, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { JewelryStockLevelBadge } from "@/components/jewelry/jewelry-stock-level-badge"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { ReportSummaryCard } from "@/components/reports/report-summary-card"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { ExportButton } from "@/components/reports/export-button"
import { RecentActivitySection } from "@/components/dashboard/recent-activity-section"
import {
  RevenueChart,
  OrdersChart,
  ProductionChart,
  InventoryChart,
  CustomerChart,
  TaskChart,
  EmployeeChart,
} from "@/components/reports/dynamic-charts"
import { createClient } from "@/lib/supabase/server"
import {
  getCustomerGrowth,
  getDashboardStats,
  getEmployeeWorkload,
  getOrdersByStatus,
  getProductionByStatus,
  getRevenueTrend,
  getTaskCompletion,
  resolveDateRange,
} from "@/lib/supabase/reports"
import { getInventoryValueByCategory } from "@/lib/supabase/inventory-shared"
import { getLowStockJewelryItems } from "@/lib/supabase/jewelry"
import { getOrders } from "@/lib/supabase/orders"
import { getTasks } from "@/lib/supabase/tasks"
import { getCustomers } from "@/lib/supabase/customers"
import { DATE_RANGE_PRESETS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ORDER_STATUS_LABELS } from "@/types/order"
import type { OrderStatus } from "@/types/order"

const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  pricing_ready: "info",
  awaiting_approval: "warning",
  approved: "success",
  confirmed: "info",
  in_production: "warning",
  ready_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface ReportsPageProps {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams
  const preset = (
    DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset) ? presetParam : "30d"
  ) as DateRangePreset
  const range = resolveDateRange(preset, fromParam, toParam)

  const supabase = await createClient()

  const [
    stats,
    revenuePoints,
    ordersByStatus,
    productionByStatus,
    inventoryByCategory,
    customerGrowth,
    taskCompletion,
    employeeWorkload,
    overdueOrders,
    overdueTasks,
    lowStockItems,
    recentCustomers,
  ] = await Promise.all([
    getDashboardStats(supabase, range),
    getRevenueTrend(supabase, range),
    getOrdersByStatus(supabase, range),
    getProductionByStatus(supabase, range),
    getInventoryValueByCategory(supabase),
    getCustomerGrowth(supabase, range),
    getTaskCompletion(supabase, range),
    getEmployeeWorkload(supabase),
    getOrders(supabase, { overdue: true, limit: 8 }),
    getTasks(supabase, { dueFilter: "overdue", limit: 8 }),
    getLowStockJewelryItems(supabase, 8),
    getCustomers(supabase, {}),
  ])

  const recentCustomersList = recentCustomers.slice(0, 8)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business performance across orders, production, inventory, customers, employees, and tasks."
        actions={<ExportButton preset={preset} from={fromParam} to={toParam} />}
      />

      <ReportsFilters />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportSummaryCard
          label="Total Revenue"
          kpi={stats.totalRevenue}
          icon={DollarSign}
          formatValue={formatCurrency}
        />
        <ReportSummaryCard label="Orders Created" kpi={stats.ordersCreated} icon={ShoppingBag} />
        <ReportSummaryCard label="Orders Delivered" kpi={stats.ordersDelivered} icon={PackageCheck} />
        <ReportSummaryCard label="Production Jobs" kpi={stats.productionJobs} icon={Gem} />
        <ReportSummaryCard
          label="Inventory Value"
          kpi={stats.inventoryValue}
          icon={Package}
          formatValue={formatCurrency}
        />
        <ReportSummaryCard label="Active Customers" kpi={stats.activeCustomers} icon={Users} />
        <ReportSummaryCard label="Active Employees" kpi={stats.activeEmployees} icon={Briefcase} />
        <ReportSummaryCard label="Open Tasks" kpi={stats.openTasks} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart points={revenuePoints} />
        <OrdersChart data={ordersByStatus} />
        <ProductionChart data={productionByStatus} />
        <InventoryChart data={inventoryByCategory} />
        <CustomerChart points={customerGrowth} />
        <TaskChart data={taskCompletion} />
      </div>

      <EmployeeChart data={employeeWorkload} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivitySection limit={15} />
        </Suspense>

        <SectionCard title="Low Stock Items">
          {lowStockItems.length === 0 ? (
            <EmptyState title="All items are well stocked" />
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <Link href={`/inventory/jewelry/${item.id}`} className="text-primary hover:underline">
                    {item.productName}
                  </Link>
                  <JewelryStockLevelBadge quantity={item.quantity} reorderLevel={item.reorderLevel} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Overdue Orders">
          {overdueOrders.length === 0 ? (
            <EmptyState title="No overdue orders" />
          ) : (
            <ul className="flex flex-col gap-2">
              {overdueOrders.slice(0, 8).map((order) => (
                <li key={order.id} className="flex items-center justify-between text-sm">
                  <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                    {order.order_number}
                  </Link>
                  <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Overdue Tasks">
          {overdueTasks.length === 0 ? (
            <EmptyState title="No overdue tasks" />
          ) : (
            <ul className="flex flex-col gap-2">
              {overdueTasks.slice(0, 8).map((task) => (
                <li key={task.id} className="flex items-center justify-between text-sm">
                  <Link href={`/tasks/${task.id}`} className="text-primary hover:underline">
                    {task.title}
                  </Link>
                  <TaskStatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Customers" className="lg:col-span-2">
          {recentCustomersList.length === 0 ? (
            <EmptyState title="No customers yet" />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recentCustomersList.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between text-sm">
                  <Link href={`/customers/${customer.id}`} className="text-primary hover:underline">
                    {customer.full_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{customer.email ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function RecentActivitySkeleton() {
  return (
    <SectionCard title="Recent Activity">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </SectionCard>
  )
}
