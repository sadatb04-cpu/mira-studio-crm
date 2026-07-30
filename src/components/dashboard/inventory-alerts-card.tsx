import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { JewelryStockLevelBadge } from "@/components/jewelry/jewelry-stock-level-badge"
import type { LowStockJewelryItem } from "@/types/jewelry"

interface InventoryAlertsCardProps {
  items: LowStockJewelryItem[]
}

export function InventoryAlertsCard({ items }: InventoryAlertsCardProps) {
  return (
    <SectionCard title="Inventory Alerts" description="Low stock and out of stock jewelry items." contentClassName="px-0">
      {items.length === 0 ? (
        <div className="px-4">
          <EmptyState icon={AlertTriangle} title="All items are well stocked" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Current Stock</th>
                <th className="px-4 py-2 text-right">Reorder Level</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    <Link href={`/inventory/jewelry/${item.id}`} className="block hover:underline">
                      {item.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link href={`/inventory/jewelry/${item.id}`} className="block hover:underline">
                      {item.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.category ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{item.reorderLevel}</td>
                  <td className="px-4 py-2.5">
                    <JewelryStockLevelBadge quantity={item.quantity} reorderLevel={item.reorderLevel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
