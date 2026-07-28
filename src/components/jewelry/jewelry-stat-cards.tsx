import { AlertTriangle, Package, Sparkles, XCircle } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { JewelryStats } from "@/types/jewelry"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface JewelryStatCardsProps {
  stats: JewelryStats
}

export function JewelryStatCards({ stats }: JewelryStatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total Products" value={stats.totalProducts} icon={Sparkles} />
      <StatCard label="Total Pieces" value={stats.totalPieces} icon={Package} />
      <StatCard label="Inventory Value" value={formatCurrency(stats.totalValue)} />
      <StatCard label="Low Stock" value={stats.lowStockCount} icon={AlertTriangle} />
      <StatCard label="Out of Stock" value={stats.outOfStockCount} icon={XCircle} />
    </div>
  )
}
