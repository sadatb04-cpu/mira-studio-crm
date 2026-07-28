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
  reorder_level: number
  selling_price: number
  metal: string | null
  purity: string | null
  weight: number | null
  stone_type: string | null
  stone_weight: number | null
  certificate_number: string | null
  notes: string | null
  supplier_id: string | null
  supplierName: string | null
}

export interface InventoryItemOption {
  id: string
  name: string
  sku: string
  unit: string
}

export interface SupplierOption {
  id: string
  name: string
}

// The manual "Add Inventory" drawer's own shape - current_stock seeds an
// initial inventory_transactions row rather than being written to
// quantity_on_hand directly (that column is trigger-maintained only).
export interface InventoryItemFormInput {
  name: string
  sku: string
  category: InventoryCategory
  supplierId?: string
  unit: string
  currentStock: number
  minimumStock: number
  reorderLevel: number
  purchasePrice: number
  sellingPrice: number
  metal?: string
  purity?: string
  weight?: number
  stoneType?: string
  stoneWeight?: number
  certificateNumber?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export const IMPORT_SOURCE_TYPES = ["xlsx", "csv", "pdf", "google_sheets"] as const
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number]

export const IMPORT_SOURCE_TYPE_LABELS: Record<ImportSourceType, string> = {
  xlsx: "Excel (.xlsx)",
  csv: "CSV",
  pdf: "PDF",
  google_sheets: "Google Sheets",
}

// The columns a parsed row can be mapped onto. sku/current_stock/etc are
// intentionally omitted from "required" - sku auto-generates and numeric
// fields default to 0, mirroring the manual add drawer's own defaults.
export const IMPORT_TARGET_FIELDS = [
  "name",
  "sku",
  "category",
  "unit",
  "current_stock",
  "minimum_stock",
  "reorder_level",
  "purchase_price",
  "selling_price",
  "metal",
  "purity",
  "weight",
  "stone_type",
  "stone_weight",
  "certificate_number",
  "notes",
] as const
export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]

export const IMPORT_FIELD_LABELS: Record<ImportTargetField, string> = {
  name: "Item Name",
  sku: "SKU",
  category: "Category",
  unit: "Unit",
  current_stock: "Current Stock",
  minimum_stock: "Minimum Stock",
  reorder_level: "Reorder Level",
  purchase_price: "Purchase Price",
  selling_price: "Selling Price",
  metal: "Metal",
  purity: "Purity",
  weight: "Weight",
  stone_type: "Stone Type",
  stone_weight: "Stone Weight",
  certificate_number: "Certificate Number",
  notes: "Notes",
}

export const IMPORT_REQUIRED_FIELDS: ImportTargetField[] = ["name", "category", "unit"]

// Maps a target field to source header names it auto-matches against
// (lowercased, punctuation-insensitive) - see lib/import/column-mapping.ts.
export const IMPORT_FIELD_ALIASES: Record<ImportTargetField, string[]> = {
  name: ["name", "item name", "itemname", "product name", "title"],
  sku: ["sku", "item code", "code", "product code"],
  category: ["category", "type", "item type"],
  unit: ["unit", "uom", "unit of measure"],
  current_stock: ["current stock", "stock", "quantity", "qty", "quantity on hand", "in stock"],
  minimum_stock: ["minimum stock", "min stock", "reorder point", "min qty"],
  reorder_level: ["reorder level", "reorder qty", "reorder threshold"],
  purchase_price: ["purchase price", "cost", "unit cost", "cost price", "buying price"],
  selling_price: ["selling price", "sale price", "price", "retail price", "mrp"],
  metal: ["metal", "metal type"],
  purity: ["purity", "karat", "karatage", "fineness"],
  weight: ["weight", "gross weight", "net weight", "weight (g)", "weight(g)"],
  stone_type: ["stone type", "stone", "gemstone"],
  stone_weight: ["stone weight", "carat", "carat weight"],
  certificate_number: ["certificate number", "certificate no", "cert no", "igi number", "certificate"],
  notes: ["notes", "remarks", "description", "comment"],
}

export type DuplicateResolution = "skip" | "update" | "create_duplicate"

export interface InventoryImportDuplicateMatch {
  id: string
  name: string
  sku: string
}

export interface InventoryImportRow {
  rowIndex: number
  mapped: Partial<Record<ImportTargetField, string>>
  errors: string[]
  duplicateOf: InventoryImportDuplicateMatch | null
  resolution: DuplicateResolution
}

export interface InventoryImportRowResult {
  rowIndex: number
  status: "created" | "updated" | "skipped" | "error"
  message?: string
}

export interface InventoryImportSummary {
  totalRows: number
  created: number
  updated: number
  skipped: number
  errors: number
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
