import Link from "next/link"
import { AlertTriangle, Briefcase, ClipboardList, DollarSign, Gem, Package, ShoppingBag, Users } from "lucide-react"

import { ReportSummaryCard } from "@/components/reports/report-summary-card"
import type { DashboardStats } from "@/types/report"
import type { InventoryStats } from "@/types/inventory"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

const cardLinkClassName = "block rounded-2xl transition-transform hover:-translate-y-0.5"

interface ExecutiveKpiGridProps {
  stats: DashboardStats
  inventoryStats: InventoryStats
}

export function ExecutiveKpiGrid({ stats, inventoryStats }: ExecutiveKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Link href="/reports" className={cardLinkClassName}>
        <ReportSummaryCard label="Revenue" kpi={stats.totalRevenue} icon={DollarSign} formatValue={formatCurrency} />
      </Link>
      <Link href="/orders" className={cardLinkClassName}>
        <ReportSummaryCard label="Orders" kpi={stats.ordersCreated} icon={ShoppingBag} />
      </Link>
      <Link href="/production" className={cardLinkClassName}>
        <ReportSummaryCard label="Production Jobs" kpi={stats.productionJobs} icon={Gem} />
      </Link>
      <Link href="/inventory" className={cardLinkClassName}>
        <ReportSummaryCard
          label="Inventory Value"
          kpi={stats.inventoryValue}
          icon={Package}
          formatValue={formatCurrency}
        />
      </Link>
      <Link href="/customers" className={cardLinkClassName}>
        <ReportSummaryCard label="Customers" kpi={stats.activeCustomers} icon={Users} />
      </Link>
      <Link href="/employees" className={cardLinkClassName}>
        <ReportSummaryCard label="Employees" kpi={stats.activeEmployees} icon={Briefcase} />
      </Link>
      <Link href="/tasks" className={cardLinkClassName}>
        <ReportSummaryCard label="Open Tasks" kpi={stats.openTasks} icon={ClipboardList} />
      </Link>
      <Link href="/inventory" className={cardLinkClassName}>
        <ReportSummaryCard
          label="Low Stock Items"
          kpi={{ value: inventoryStats.lowStockCount }}
          icon={AlertTriangle}
        />
      </Link>
    </div>
  )
}
