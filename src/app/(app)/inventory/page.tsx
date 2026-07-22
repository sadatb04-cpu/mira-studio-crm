import { Package } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { createClient } from "@/lib/supabase/server"
import { getInventoryItems, getInventoryStats } from "@/lib/supabase/inventory"
import { InventoryFilters } from "@/components/inventory/inventory-filters"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { INVENTORY_CATEGORIES } from "@/types/inventory"
import type { InventoryCategory, StockStatus } from "@/types/inventory"

const STOCK_STATUSES: StockStatus[] = ["in_stock", "low_stock", "out_of_stock"]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface InventoryPageProps {
  searchParams: Promise<{ q?: string; category?: string; stockStatus?: string }>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const { q, category, stockStatus } = await searchParams
  const supabase = await createClient()

  const validCategory = INVENTORY_CATEGORIES.includes(category as InventoryCategory)
    ? (category as InventoryCategory)
    : undefined
  const validStockStatus = STOCK_STATUSES.includes(stockStatus as StockStatus)
    ? (stockStatus as StockStatus)
    : undefined

  const [items, stats] = await Promise.all([
    getInventoryItems(supabase, { search: q, category: validCategory, stockStatus: validStockStatus }),
    getInventoryStats(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Inventory" description="Monitor raw materials, precious elements, and stock levels." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Inventory Items" value={stats.totalItems} icon={Package} />
        <StatCard label="Total Inventory Value" value={formatCurrency(stats.totalValue)} />
        <StatCard label="Low Stock Items" value={stats.lowStockCount} />
        <StatCard label="Out of Stock Items" value={stats.outOfStockCount} />
      </div>

      <InventoryFilters />

      <InventoryTable items={items} />
    </div>
  )
}
