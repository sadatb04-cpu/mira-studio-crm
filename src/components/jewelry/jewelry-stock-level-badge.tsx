import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { JEWELRY_STOCK_LEVEL_LABELS, getJewelryStockLevel } from "@/types/jewelry"
import type { JewelryStockLevel } from "@/types/jewelry"

const STOCK_LEVEL_TONE: Record<JewelryStockLevel, StatusTone> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
}

interface JewelryStockLevelBadgeProps {
  quantity: number
  reorderLevel: number
  className?: string
}

export function JewelryStockLevelBadge({ quantity, reorderLevel, className }: JewelryStockLevelBadgeProps) {
  const level = getJewelryStockLevel(quantity, reorderLevel)
  return <StatusBadge label={JEWELRY_STOCK_LEVEL_LABELS[level]} tone={STOCK_LEVEL_TONE[level]} className={className} />
}
