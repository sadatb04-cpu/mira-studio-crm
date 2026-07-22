export type InventoryCategory =
  | "gold"
  | "lab_diamond"
  | "natural_diamond"
  | "gemstone"
  | "finding"
  | "packaging"
  | "consumable"
  | "finished_jewelry"

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "gold",
  "lab_diamond",
  "natural_diamond",
  "gemstone",
  "finding",
  "packaging",
  "consumable",
  "finished_jewelry",
]

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  gold: "Precious Metals",
  lab_diamond: "Lab Diamonds",
  natural_diamond: "Natural Diamonds",
  gemstone: "Gemstones",
  finding: "Findings",
  packaging: "Packaging",
  consumable: "Consumables",
  finished_jewelry: "Finished Jewellery",
}

export type InventoryTransactionType =
  | "purchase"
  | "allocation"
  | "production_use"
  | "adjustment"
  | "return"
  | "finished_goods"
  | "sale"

export const INVENTORY_TRANSACTION_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  purchase: "Purchase",
  allocation: "Allocation",
  production_use: "Production Use",
  adjustment: "Adjustment",
  return: "Return",
  finished_goods: "Finished Goods",
  sale: "Sale",
}

export type InventoryReferenceType = "order" | "production_job" | "purchase" | "adjustment" | "manual"

// Derived at read time from quantity_on_hand vs minimum_stock - never stored.
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock"

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
}

export function getStockStatus(quantityOnHand: number, minimumStock: number): StockStatus {
  if (quantityOnHand <= 0) return "out_of_stock"
  if (quantityOnHand <= minimumStock) return "low_stock"
  return "in_stock"
}

export interface InventoryItemListItem {
  id: string
  sku: string
  name: string
  category: InventoryCategory
  unit: string
  quantity_on_hand: number
  minimum_stock: number
  unit_cost: number
  updated_at: string
}

export interface InventoryItemDetail extends InventoryItemListItem {
  subcategory: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryItemOption {
  id: string
  name: string
  sku: string
  unit: string
}

export interface InventoryTransactionDetail {
  id: string
  transaction_type: InventoryTransactionType
  quantity: number
  notes: string | null
  reference_type: InventoryReferenceType
  reference_id: string | null
  created_at: string
  relatedProductionJob: { id: string; job_number: string } | null
  relatedOrder: { id: string; order_number: string } | null
}

export interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}
