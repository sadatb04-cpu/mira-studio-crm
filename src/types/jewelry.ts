export const JEWELRY_STATUSES = ["active", "reserved", "sold", "discontinued"] as const
export type JewelryStatus = (typeof JEWELRY_STATUSES)[number]

export const JEWELRY_STATUS_LABELS: Record<JewelryStatus, string> = {
  active: "Active",
  reserved: "Reserved",
  sold: "Sold",
  discontinued: "Discontinued",
}

export const JEWELRY_CATEGORIES = [
  "Ring",
  "Necklace",
  "Earrings",
  "Bracelet",
  "Pendant",
  "Bangle",
  "Chain",
  "Set",
  "Other",
] as const
export type JewelryCategory = (typeof JEWELRY_CATEGORIES)[number]

// Derived at read time from quantity vs reorder_level - never stored,
// same pattern as the old system's stock status, layered under the new
// manually-set `status` column.
export type JewelryStockLevel = "in_stock" | "low_stock" | "out_of_stock"

export const JEWELRY_STOCK_LEVEL_LABELS: Record<JewelryStockLevel, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
}

export function getJewelryStockLevel(quantity: number, reorderLevel: number): JewelryStockLevel {
  if (quantity <= 0) return "out_of_stock"
  if (quantity <= reorderLevel) return "low_stock"
  return "in_stock"
}

export interface JewelryListItem {
  id: string
  sku: string
  product_name: string
  category: string | null
  metal: string | null
  quantity: number
  reorder_level: number
  cost: number
  selling_price: number
  status: JewelryStatus
  updated_at: string
}

export interface JewelryDetail extends JewelryListItem {
  metal_purity: string | null
  diamond_type: string | null
  diamond_weight: number | null
  gross_weight: number | null
  net_weight: number | null
  location: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  supplier_id: string | null
  supplierName: string | null
}

// currentStock seeds an `initial` stock movement rather than being written
// to `quantity` directly (that column is trigger-maintained only).
export interface JewelryFormInput {
  sku: string
  productName: string
  category?: JewelryCategory
  metal?: string
  metalPurity?: string
  diamondType?: string
  diamondWeight?: number
  grossWeight?: number
  netWeight?: number
  cost: number
  sellingPrice: number
  currentStock: number
  reorderLevel: number
  status: JewelryStatus
  location?: string
  supplierId?: string
  notes?: string
}

export interface AdjustJewelryStockInput {
  jewelryItemId: string
  quantity: number
  direction: "increase" | "decrease"
  notes?: string
}

export interface JewelryStats {
  totalProducts: number
  totalPieces: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export const JEWELRY_IMPORT_TARGET_FIELDS = [
  "sku",
  "productName",
  "category",
  "metal",
  "metalPurity",
  "diamondType",
  "diamondWeight",
  "grossWeight",
  "netWeight",
  "cost",
  "sellingPrice",
  "currentStock",
  "status",
  "location",
  "notes",
] as const
export type JewelryImportField = (typeof JEWELRY_IMPORT_TARGET_FIELDS)[number]

export const JEWELRY_IMPORT_FIELD_LABELS: Record<JewelryImportField, string> = {
  sku: "SKU",
  productName: "Product Name",
  category: "Category",
  metal: "Metal",
  metalPurity: "Metal Purity",
  diamondType: "Diamond Type",
  diamondWeight: "Diamond Weight",
  grossWeight: "Gross Weight",
  netWeight: "Net Weight",
  cost: "Cost",
  sellingPrice: "Selling Price",
  currentStock: "Quantity",
  status: "Status",
  location: "Location",
  notes: "Notes",
}

export const JEWELRY_IMPORT_REQUIRED_FIELDS: JewelryImportField[] = ["sku", "productName"]

export const JEWELRY_IMPORT_FIELD_ALIASES: Record<JewelryImportField, string[]> = {
  sku: ["sku", "item code", "code", "product code"],
  productName: ["product name", "name", "item name", "title", "description"],
  category: ["category", "type", "item type", "jewelry type"],
  metal: ["metal", "metal type"],
  metalPurity: ["metal purity", "purity", "karat", "karatage", "fineness"],
  diamondType: ["diamond type", "stone type", "diamond"],
  diamondWeight: ["diamond weight", "stone weight", "carat", "carat weight"],
  grossWeight: ["gross weight", "weight", "total weight"],
  netWeight: ["net weight", "metal weight"],
  cost: ["cost", "cost price", "unit cost", "buying price", "amount usd", "rate"],
  sellingPrice: ["selling price", "sale price", "price", "retail price", "mrp"],
  currentStock: ["quantity", "current stock", "stock", "qty", "quantity on hand", "in stock"],
  status: ["status"],
  location: ["location", "storage location", "bin"],
  notes: ["notes", "remarks", "comment"],
}
