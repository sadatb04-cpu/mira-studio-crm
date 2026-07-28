import { Diamond, Gem, Layers, Sparkles } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { LooseDiamondStats } from "@/types/loose-diamond"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface LooseDiamondStatCardsProps {
  stats: LooseDiamondStats
}

export function LooseDiamondStatCards({ stats }: LooseDiamondStatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total Stones" value={stats.totalStones} icon={Diamond} />
      <StatCard label="Total Carats" value={stats.totalCarats.toFixed(2)} icon={Gem} />
      <StatCard label="Inventory Value" value={formatCurrency(stats.totalValue)} />
      <StatCard label="Avg Cost/Carat" value={formatCurrency(stats.averageCostPerCarat)} />
      <StatCard label="Avg Carat" value={stats.averageCarat.toFixed(2)} icon={Layers} />
      <StatCard label="Recently Added" value={stats.recentlyAddedCount} icon={Sparkles} description="Last 7 days" />
    </div>
  )
}
