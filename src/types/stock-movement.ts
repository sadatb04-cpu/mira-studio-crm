// Shared by both Loose Diamonds and Jewelry - one ledger table
// (inventory_stock_movements), one shape, one history table component.

export const STOCK_MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "production_use",
  "adjustment",
  "return",
  "status_change",
  "initial",
] as const
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: "Purchase",
  sale: "Sale",
  production_use: "Production Use",
  adjustment: "Adjustment",
  return: "Return",
  status_change: "Status Change",
  initial: "Initial Stock",
}

// Mirrors the old inventory_reference_type enum's values (same underlying
// Postgres enum is reused by the new table), redeclared here so new code
// never needs to import from the dormant types/inventory.ts.
export type StockMovementReferenceType = "order" | "production_job" | "purchase" | "adjustment" | "manual"

export interface StockMovementDetail {
  id: string
  movement_type: StockMovementType
  quantity_delta: number | null
  previous_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
  createdByName: string | null
}
