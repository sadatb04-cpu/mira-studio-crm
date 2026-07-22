import { SectionCard } from "@/components/shared/section-card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ExecutiveKpiGrid } from "@/components/dashboard/executive-kpi-grid"
import { InventoryAlertsCard } from "@/components/dashboard/inventory-alerts-card"
import { TodaysTasksCard } from "@/components/dashboard/todays-tasks-card"
import { UpcomingOrdersCard } from "@/components/dashboard/upcoming-orders-card"
import { RecentCustomersCard } from "@/components/dashboard/recent-customers-card"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import { RevenueChart } from "@/components/reports/revenue-chart"
import { OrdersChart } from "@/components/reports/orders-chart"
import { ProductionChart } from "@/components/reports/production-chart"
import { CustomerChart } from "@/components/reports/customer-chart"
import { TaskChart } from "@/components/reports/task-chart"
import { EmployeeChart } from "@/components/reports/employee-chart"
import { RecentActivity } from "@/components/reports/recent-activity"
import { createClient } from "@/lib/supabase/server"
import { getExecutiveDashboard } from "@/lib/supabase/dashboard"
import { resolveDateRange } from "@/lib/supabase/reports"
import { DASHBOARD_DATE_RANGE_PRESETS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

interface DashboardPageProps {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams
  const preset = (
    DASHBOARD_DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset) ? presetParam : "30d"
  ) as DateRangePreset
  const range = resolveDateRange(preset, fromParam, toParam)

  const supabase = await createClient()
  const dashboard = await getExecutiveDashboard(supabase, range)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader preset={preset} from={fromParam} to={toParam} />

      <ExecutiveKpiGrid stats={dashboard.stats} inventoryStats={dashboard.inventoryStats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart points={dashboard.revenue} />
        <OrdersChart data={dashboard.orders} />
        <ProductionChart data={dashboard.production} />
        <CustomerChart points={dashboard.customerGrowth} />
        <TaskChart data={dashboard.taskCompletion} />
      </div>

      <EmployeeChart data={dashboard.employeeWorkload} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryAlertsCard items={dashboard.inventoryAlerts} />
        <TodaysTasksCard tasks={dashboard.todaysTasks} />
        <UpcomingOrdersCard orders={dashboard.upcomingOrders} />
        <RecentCustomersCard customers={dashboard.recentCustomers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Recent Activity">
          <RecentActivity items={dashboard.recentActivity} />
        </SectionCard>

        <QuickActionsCard />
      </div>
    </div>
  )
}
