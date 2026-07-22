import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { STOCK_STATUS_LABELS, getStockStatus } from "@/types/inventory"
import type { StockStatus } from "@/types/inventory"

const STOCK_STATUS_TONE: Record<StockStatus, StatusTone> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
}

interface InventoryStatusBadgeProps {
  quantityOnHand: number
  minimumStock: number
  className?: string
}

export function InventoryStatusBadge({ quantityOnHand, minimumStock, className }: InventoryStatusBadgeProps) {
  const status = getStockStatus(quantityOnHand, minimumStock)
  return <StatusBadge label={STOCK_STATUS_LABELS[status]} tone={STOCK_STATUS_TONE[status]} className={className} />
}
