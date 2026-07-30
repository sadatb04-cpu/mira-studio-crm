import { Suspense } from "react"

import { SectionCard } from "@/components/shared/section-card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ExecutiveKpiGrid } from "@/components/dashboard/executive-kpi-grid"
import { InventoryAlertsCard } from "@/components/dashboard/inventory-alerts-card"
import { TodaysTasksCard } from "@/components/dashboard/todays-tasks-card"
import { UpcomingOrdersCard } from "@/components/dashboard/upcoming-orders-card"
import { RecentCustomersCard } from "@/components/dashboard/recent-customers-card"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import { RecentActivitySection } from "@/components/dashboard/recent-activity-section"
import { RevenueChart, OrdersChart, ProductionChart, CustomerChart, TaskChart, EmployeeChart } from "@/components/reports/dynamic-charts"
import { PermissionGate } from "@/components/providers/permission-gate"
import { createClient } from "@/lib/supabase/server"
import { getExecutiveDashboard } from "@/lib/supabase/dashboard"
import { resolveDateRange } from "@/lib/supabase/reports"
import { getSettingsBundle } from "@/lib/supabase/settings"
import { requirePageView } from "@/lib/require-page-permission"
import { DASHBOARD_DATE_RANGE_PRESETS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"

interface DashboardPageProps {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requirePageView("dashboard")

  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams
  const supabase = await createClient()

  // Falls back to the org's configured "Default Dashboard Range" (Settings
  // > User Preferences) only when no explicit preset is in the URL - a
  // non-admin session can't read that setting (RLS), so it silently
  // resolves to the same "30d" default as before for those users.
  let preset: DateRangePreset
  if (DASHBOARD_DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset)) {
    preset = presetParam as DateRangePreset
  } else {
    const settings = await getSettingsBundle(supabase)
    preset = settings.userPreferences.defaultDashboardRange
  }

  const range = resolveDateRange(preset, fromParam, toParam)
  const dashboard = await getExecutiveDashboard(supabase, range)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader preset={preset} from={fromParam} to={toParam} />

      <ExecutiveKpiGrid stats={dashboard.stats} lowStockJewelryCount={dashboard.inventoryStats.lowStockJewelry} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart points={dashboard.revenue} />
        <OrdersChart data={dashboard.orders} />
        <ProductionChart data={dashboard.production} />
        <CustomerChart points={dashboard.customerGrowth} />
        <PermissionGate module="tasks" action="view">
          <TaskChart data={dashboard.taskCompletion} />
        </PermissionGate>
      </div>

      <EmployeeChart data={dashboard.employeeWorkload} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryAlertsCard items={dashboard.inventoryAlerts} />
        <PermissionGate module="tasks" action="view">
          <TodaysTasksCard tasks={dashboard.todaysTasks} />
        </PermissionGate>
        <UpcomingOrdersCard orders={dashboard.upcomingOrders} />
        <RecentCustomersCard customers={dashboard.recentCustomers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivitySection limit={12} />
        </Suspense>

        <QuickActionsCard />
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
