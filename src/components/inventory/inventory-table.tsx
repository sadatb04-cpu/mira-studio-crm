"use client"

import { Package } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { InventoryStatusBadge } from "@/components/inventory/inventory-status-badge"
import { getStockStatus, INVENTORY_CATEGORY_LABELS } from "@/types/inventory"
import type { InventoryItemListItem, StockStatus } from "@/types/inventory"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
}

// Out of Stock gets the more saturated tint - highest visual priority.
const ROW_TONE: Partial<Record<StockStatus, string>> = {
  out_of_stock: "bg-destructive/10",
  low_stock: "bg-warning/5",
}

interface InventoryTableProps {
  items: InventoryItemListItem[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={Package}
          title="No inventory items found"
          description="Try adjusting your search or filters."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Item Name</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Unit</th>
            <th className="px-4 py-2 text-right">Quantity on Hand</th>
            <th className="px-4 py-2 text-right">Reorder Threshold</th>
            <th className="px-4 py-2 text-right">Unit Cost</th>
            <th className="px-4 py-2 text-right">Inventory Value</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item.quantity_on_hand, item.minimum_stock)
            const value = item.quantity_on_hand * item.unit_cost

            return (
              <tr
                key={item.id}
                onClick={() => router.push(`/inventory/${item.id}`)}
                className={cn(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-muted/50",
                  ROW_TONE[status]
                )}
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/inventory/${item.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="font-medium text-foreground hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{item.sku}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{INVENTORY_CATEGORY_LABELS[item.category]}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.unit}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity_on_hand}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.minimum_stock}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(item.unit_cost)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-foreground">{formatCurrency(value)}</td>
                <td className="px-4 py-2.5">
                  <InventoryStatusBadge quantityOnHand={item.quantity_on_hand} minimumStock={item.minimum_stock} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(item.updated_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </SectionCard>
  )
}
