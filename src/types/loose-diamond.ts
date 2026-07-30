export const LOOSE_DIAMOND_STATUSES = ["available", "reserved", "sold", "on_memo"] as const
export type LooseDiamondStatus = (typeof LOOSE_DIAMOND_STATUSES)[number]

export const LOOSE_DIAMOND_STATUS_LABELS: Record<LooseDiamondStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  on_memo: "On Memo",
}

// Suggested values for the Shape/Growth Type dropdowns - both DB columns
// are free text, so bulk-imported data outside this list still lands
// cleanly rather than being rejected.
export const DIAMOND_SHAPE_SUGGESTIONS = [
  "Round",
  "Princess",
  "Cushion",
  "Emerald",
  "Oval",
  "Radiant",
  "Pear",
  "Marquise",
  "Heart",
  "Asscher",
] as const

export const DIAMOND_GROWTH_TYPE_SUGGESTIONS = ["Natural", "Lab Grown - CVD", "Lab Grown - HPHT"] as const

export const DIAMOND_COLOR_SUGGESTIONS = ["D", "E", "F", "G", "H", "I", "J", "K"] as const

export const DIAMOND_CLARITY_SUGGESTIONS = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"] as const

export interface LooseDiamondListItem {
  id: string
  report_number: string
  lab: string | null
  shape: string | null
  carat: number
  color: string | null
  clarity: string | null
  growth_type: string | null
  cost_usd: number
  selling_price: number
  status: LooseDiamondStatus
  updated_at: string
}

export interface LooseDiamondDetail extends LooseDiamondListItem {
  cut: string | null
  polish: string | null
  symmetry: string | null
  fluorescence: string | null
  country_of_origin: string | null
  notes: string | null
  date_added: string
  is_active: boolean
  created_at: string
  supplier_id: string | null
  supplierName: string | null
}

// selling_price is never part of this input - it's a generated column
// (cost_usd * 1.15), computed by the database and never accepted from the
// form, an import, or anywhere else. See migration 0021.
export interface LooseDiamondFormInput {
  reportNumber: string
  lab?: string
  shape?: string
  carat: number
  color?: string
  clarity?: string
  cut?: string
  polish?: string
  symmetry?: string
  fluorescence?: string
  growthType?: string
  countryOfOrigin?: string
  costUsd: number
  status: LooseDiamondStatus
  supplierId?: string
  notes?: string
}

export interface LooseDiamondStats {
  totalStones: number
  totalCarats: number
  totalValue: number
  averageCostPerCarat: number
  averageCarat: number
  availableCount: number
  reservedCount: number
  soldCount: number
  recentlyAddedCount: number
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

// No sellingPrice target field - it's a generated column (cost_usd * 1.15),
// so the import wizard never asks the user to map a selling-price column;
// every imported diamond gets a correct, consistent selling price for free.
export const LOOSE_DIAMOND_IMPORT_TARGET_FIELDS = [
  "reportNumber",
  "lab",
  "shape",
  "carat",
  "color",
  "clarity",
  "cut",
  "polish",
  "symmetry",
  "fluorescence",
  "growthType",
  "countryOfOrigin",
  "costUsd",
  "status",
  "notes",
] as const
export type LooseDiamondImportField = (typeof LOOSE_DIAMOND_IMPORT_TARGET_FIELDS)[number]

export const LOOSE_DIAMOND_IMPORT_FIELD_LABELS: Record<LooseDiamondImportField, string> = {
  reportNumber: "Report Number",
  lab: "Lab",
  shape: "Shape",
  carat: "Carat",
  color: "Color",
  clarity: "Clarity",
  cut: "Cut",
  polish: "Polish",
  symmetry: "Symmetry",
  fluorescence: "Fluorescence",
  growthType: "Growth Type",
  countryOfOrigin: "Country of Origin",
  costUsd: "Cost (USD)",
  status: "Status",
  notes: "Notes",
}

export const LOOSE_DIAMOND_IMPORT_REQUIRED_FIELDS: LooseDiamondImportField[] = ["reportNumber", "carat"]

// Header names the auto-mapper recognizes (lowercased, punctuation-
// insensitive) - see lib/import/column-mapping.ts.
export const LOOSE_DIAMOND_IMPORT_FIELD_ALIASES: Record<LooseDiamondImportField, string[]> = {
  reportNumber: [
    "report number",
    "report no",
    "certificate no",
    "certificate number",
    "igi number",
    "igi no",
    "gia number",
    "gia no",
    "cert no",
    "cert number",
    "lab report number",
  ],
  lab: ["lab", "laboratory", "grading lab"],
  shape: ["shape", "cut shape"],
  carat: ["carat", "ct", "weight", "carat weight"],
  color: ["color", "colour"],
  clarity: ["clarity"],
  cut: ["cut", "cut grade"],
  polish: ["polish"],
  symmetry: ["symmetry", "symm"],
  fluorescence: ["fluorescence", "fluor"],
  growthType: ["growth type", "type", "origin type", "natural/lab", "natural or lab"],
  countryOfOrigin: ["country of origin", "origin", "country"],
  costUsd: ["cost usd", "cost", "cost price", "amount usd", "rate", "price usd", "buying price"],
  status: ["status"],
  notes: ["notes", "remarks", "comment", "description"],
}
