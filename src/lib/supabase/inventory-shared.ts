import type { SupabaseClient } from "@supabase/supabase-js"

import { getLooseDiamondStats } from "@/lib/supabase/loose-diamonds"
import { getJewelryStats } from "@/lib/supabase/jewelry"
import { JEWELRY_CATEGORIES } from "@/types/jewelry"
import type { ImportSourceType, ImportSummary } from "@/types/import"
import type { InventoryByCategory } from "@/types/report"
import type { StockMovementDetail, StockMovementReferenceType, StockMovementType } from "@/types/stock-movement"

export interface InventoryDashboardStats {
  totalInventoryValue: number
  looseDiamondValue: number
  jewelryValue: number
  lowStockJewelry: number
  looseStonesAvailable: number
  looseStonesReserved: number
  totalStones: number
  totalJewelryProducts: number
}

// Aggregates both category modules for the Inventory landing page - stays
// here (rather than in loose-diamonds.ts or jewelry.ts) so it has no
// "belongs to one category" ambiguity, and so a third category later only
// needs one more stats call added to the Promise.all below.
export async function getInventoryDashboardStats(supabase: SupabaseClient): Promise<InventoryDashboardStats> {
  const [diamondStats, jewelryStats] = await Promise.all([getLooseDiamondStats(supabase), getJewelryStats(supabase)])

  return {
    totalInventoryValue: diamondStats.totalValue + jewelryStats.totalValue,
    looseDiamondValue: diamondStats.totalValue,
    jewelryValue: jewelryStats.totalValue,
    lowStockJewelry: jewelryStats.lowStockCount,
    looseStonesAvailable: diamondStats.availableCount,
    looseStonesReserved: diamondStats.reservedCount,
    totalStones: diamondStats.totalStones,
    totalJewelryProducts: jewelryStats.totalProducts,
  }
}

// Replaces the old reports.ts's getInventoryByCategory() (which queried the
// deprecated inventory_items table's generic material categories). The new
// schema only has category concepts within jewelry_inventory (Ring/Necklace/
// etc) - loose diamonds have no category, so their total value is folded
// into one "Loose Diamonds" bucket alongside the jewelry categories,
// preserving the same "value by category" bar chart shape. Only the columns
// each aggregate needs are selected, not full rows.
export async function getInventoryValueByCategory(supabase: SupabaseClient): Promise<InventoryByCategory[]> {
  const [jewelryResult, diamondResult] = await Promise.all([
    supabase.from("jewelry_inventory").select("category, quantity, cost").eq("is_active", true),
    supabase.from("loose_diamonds").select("cost_usd").eq("is_active", true),
  ])

  if (jewelryResult.error) throw jewelryResult.error
  if (diamondResult.error) throw diamondResult.error

  const valueByCategory = new Map<string, number>()
  for (const row of jewelryResult.data ?? []) {
    const category = row.category ?? "Other"
    valueByCategory.set(category, (valueByCategory.get(category) ?? 0) + Number(row.quantity) * Number(row.cost))
  }

  const diamondValue = (diamondResult.data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0)

  return [
    ...JEWELRY_CATEGORIES.map((category) => ({ category, value: valueByCategory.get(category) ?? 0 })),
    { category: "Loose Diamonds", value: diamondValue },
  ]
}

export interface SupplierOption {
  id: string
  name: string
}

// Shared by both categories' forms - suppliers are reused via FK, never
// free text.
export async function getSupplierOptions(supabase: SupabaseClient): Promise<SupplierOption[]> {
  const { data, error } = await supabase.from("suppliers").select("id, supplier_name").order("supplier_name")
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.supplier_name }))
}

// Fetches every row's key column and matches case-insensitively in JS,
// rather than an exact `.in()` filter on the (possibly differently-cased)
// import values - a case mismatch between a spreadsheet's Report Number
// and what's stored would otherwise silently miss a real duplicate.
// Returns lowercased-key -> row id.
//
// "orders"/"order_number" is Orders' Bulk Import reusing this despite the
// module being named for inventory - the lookup itself has never been
// category-specific, only the caller's table/column choice is.
export async function findDuplicatesByKey(
  supabase: SupabaseClient,
  table: "loose_diamonds" | "jewelry_inventory" | "orders",
  keyColumn: "report_number" | "sku" | "order_number",
  values: string[]
): Promise<Map<string, string>> {
  const wanted = new Set(values.filter(Boolean).map((value) => value.toLowerCase()))
  if (wanted.size === 0) return new Map()

  const { data, error } = await supabase.from(table).select(`id, ${keyColumn}`)
  if (error) throw error

  const map = new Map<string, string>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const key = String(row[keyColumn] ?? "").toLowerCase()
    if (wanted.has(key)) {
      map.set(key, row.id as string)
    }
  }
  return map
}

export interface StockMovementInput {
  looseDiamondId?: string
  jewelryItemId?: string
  movementType: StockMovementType
  quantityDelta?: number
  previousStatus?: string
  newStatus?: string
  referenceType?: StockMovementReferenceType
  referenceId?: string
  notes?: string
}

// The single insert path into inventory_stock_movements - every quantity
// change and status transition for both categories goes through here
// rather than writing `quantity`/`status` directly; the DB trigger
// (apply_inventory_stock_movement) applies the effect.
export async function recordStockMovement(supabase: SupabaseClient, input: StockMovementInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("inventory_stock_movements").insert({
    loose_diamond_id: input.looseDiamondId ?? null,
    jewelry_item_id: input.jewelryItemId ?? null,
    movement_type: input.movementType,
    quantity_delta: input.quantityDelta ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    reference_type: input.referenceType ?? null,
    reference_id: input.referenceId ?? null,
    notes: input.notes ?? null,
    created_by: user?.id ?? null,
  })

  if (error) throw error
}

export const STOCK_MOVEMENTS_PAGE_SIZE = 20

export interface StockMovementsPage {
  movements: StockMovementDetail[]
  hasMore: boolean
}

// Shared read path for both categories' detail-page ledger tables. The
// ledger is append-only and only ever grows, so this is paginated rather
// than loading an item's entire history on every page view - the caller
// (StockMovementTable) only requests more once the user clicks "Load More".
// Fetches one extra row beyond the page size to detect "is there more?"
// without a separate count query.
export async function getStockMovements(
  supabase: SupabaseClient,
  filter: { looseDiamondId?: string; jewelryItemId?: string; offset?: number; limit?: number }
): Promise<StockMovementsPage> {
  const offset = filter.offset ?? 0
  const limit = filter.limit ?? STOCK_MOVEMENTS_PAGE_SIZE

  let query = supabase
    .from("inventory_stock_movements")
    .select("id, movement_type, quantity_delta, previous_status, new_status, notes, created_at, creator:profiles(full_name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit)

  query = filter.looseDiamondId ? query.eq("loose_diamond_id", filter.looseDiamondId) : query.eq("jewelry_item_id", filter.jewelryItemId)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<Omit<StockMovementDetail, "createdByName"> & { creator: { full_name: string } | null }>
  const hasMore = rows.length > limit

  return {
    movements: rows.slice(0, limit).map(({ creator, ...row }) => ({ ...row, createdByName: creator?.full_name ?? null })),
    hasMore,
  }
}

// inventory_import_batches is shared across every category via its
// `category` discriminator column - a new category never needs its own
// migration just to log imports.
export async function recordInventoryImportBatch(
  supabase: SupabaseClient,
  input: {
    category: string
    sourceType: ImportSourceType
    sourceName: string
    googleSheetUrl?: string
    summary: ImportSummary
  }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("inventory_import_batches").insert({
    category: input.category,
    source_type: input.sourceType,
    source_name: input.sourceName,
    google_sheet_url: input.googleSheetUrl || null,
    total_rows: input.summary.totalRows,
    created_count: input.summary.created,
    updated_count: input.summary.updated,
    skipped_count: input.summary.skipped,
    error_count: input.summary.errors,
    imported_by: user?.id ?? null,
  })

  if (error) throw error
}

// Best-effort only, matching the non-throwing activity logging pattern
// used throughout the app (e.g. logActivity() in the old inventory.ts).
export async function logInventoryActivity(
  supabase: SupabaseClient,
  entry: { entityType: "loose_diamond" | "jewelry_item"; entityId: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}
