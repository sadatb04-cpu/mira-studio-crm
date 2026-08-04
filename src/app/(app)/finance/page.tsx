import { Factory, Receipt, Store } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { FinanceSectionCard } from "@/components/finance/finance-section-card"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { getManufacturerDashboardStats } from "@/lib/supabase/finance-manufacturers"
import { getSellerDashboardStats } from "@/lib/supabase/finance-sellers"
import { getFinanceExpensesThisMonthTotal } from "@/lib/supabase/finance-expenses"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export default async function FinancePage() {
  await requirePageView("finance")

  const supabase = await createClient()

  const [manufacturerStats, sellerStats, expensesThisMonth] = await Promise.all([
    getManufacturerDashboardStats(supabase),
    getSellerDashboardStats(supabase),
    getFinanceExpensesThisMonthTotal(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Finance" description="Manufacturing invoices, seller profit, and company expenses - in one simple place." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Manufacturing Spend" value={formatCurrency(manufacturerStats.totalManufacturingSpend)} icon={Factory} />
        <StatCard label="Total Seller Profit" value={formatCurrency(sellerStats.totalSellerProfit)} icon={Store} />
        <StatCard label="Company Expenses This Month" value={formatCurrency(expensesThisMonth)} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceSectionCard
          href="/finance/manufacturing"
          label="Manufacturing"
          description="Manufacturers and the invoices they've billed."
          icon={Factory}
          valueLabel={`${manufacturerStats.manufacturerCount} Manufacturer${manufacturerStats.manufacturerCount === 1 ? "" : "s"}`}
        />
        <FinanceSectionCard
          href="/finance/sellers"
          label="Sellers"
          description="Sellers, their sales, and automatically calculated profit."
          icon={Store}
          valueLabel={`${sellerStats.sellerCount} Seller${sellerStats.sellerCount === 1 ? "" : "s"}`}
        />
        <FinanceSectionCard
          href="/finance/expenses"
          label="Company Expenses"
          description="Salaries, rent, and everything else not tied to manufacturing or sellers."
          icon={Receipt}
          valueLabel={formatCurrency(expensesThisMonth)}
        />
      </div>
    </div>
  )
}
