import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { InventoryStatusBadge } from "@/components/inventory/inventory-status-badge"
import { INVENTORY_CATEGORY_LABELS } from "@/types/inventory"
import type { InventoryItemListItem } from "@/types/inventory"

interface InventoryAlertsCardProps {
  items: InventoryItemListItem[]
}

export function InventoryAlertsCard({ items }: InventoryAlertsCardProps) {
  return (
    <SectionCard title="Inventory Alerts" description="Low stock and out of stock items." contentClassName="px-0">
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
                <th className="px-4 py-2 text-right">Minimum Stock</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    <Link href={`/inventory/${item.id}`} className="block hover:underline">
                      {item.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link href={`/inventory/${item.id}`} className="block hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{INVENTORY_CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {item.quantity_on_hand} {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {item.minimum_stock} {item.unit}
                  </td>
                  <td className="px-4 py-2.5">
                    <InventoryStatusBadge quantityOnHand={item.quantity_on_hand} minimumStock={item.minimum_stock} />
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
