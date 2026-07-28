import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { CategoryLandingCard } from "@/components/inventory/category-landing-card"
import { createClient } from "@/lib/supabase/server"
import { getInventoryDashboardStats } from "@/lib/supabase/inventory-shared"
import { INVENTORY_CATEGORY_DEFS } from "@/types/inventory-categories"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

const COUNT_LABEL: Record<string, (stats: Awaited<ReturnType<typeof getInventoryDashboardStats>>) => string> = {
  loose_diamonds: (stats) => `${stats.totalStones} Stone${stats.totalStones === 1 ? "" : "s"}`,
  jewelry: (stats) => `${stats.totalJewelryProducts} Item${stats.totalJewelryProducts === 1 ? "" : "s"}`,
}

export default async function InventoryLandingPage() {
  const supabase = await createClient()
  const stats = await getInventoryDashboardStats(supabase)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Inventory" description="Category-based inventory management for the full jewelry manufacturing lifecycle." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Inventory Value" value={formatCurrency(stats.totalInventoryValue)} />
        <StatCard label="Loose Diamond Value" value={formatCurrency(stats.looseDiamondValue)} />
        <StatCard label="Jewelry Value" value={formatCurrency(stats.jewelryValue)} />
        <StatCard label="Low Stock Jewelry" value={stats.lowStockJewelry} />
        <StatCard label="Loose Stones Available" value={stats.looseStonesAvailable} />
        <StatCard label="Loose Stones Reserved" value={stats.looseStonesReserved} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INVENTORY_CATEGORY_DEFS.map((category) => (
          <CategoryLandingCard key={category.id} category={category} countLabel={COUNT_LABEL[category.id]?.(stats)} />
        ))}
      </div>
    </div>
  )
}
