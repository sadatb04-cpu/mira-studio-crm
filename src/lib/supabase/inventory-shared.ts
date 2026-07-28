import type { SupabaseClient } from "@supabase/supabase-js"

import { getLooseDiamondStats } from "@/lib/supabase/loose-diamonds"
import { getJewelryStats } from "@/lib/supabase/jewelry"
import type { ImportSourceType, ImportSummary } from "@/types/import"
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
export async function findDuplicatesByKey(
  supabase: SupabaseClient,
  table: "loose_diamonds" | "jewelry_inventory",
  keyColumn: "report_number" | "sku",
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

// Shared read path for both categories' detail-page ledger tables.
export async function getStockMovements(
  supabase: SupabaseClient,
  filter: { looseDiamondId?: string; jewelryItemId?: string }
): Promise<StockMovementDetail[]> {
  let query = supabase
    .from("inventory_stock_movements")
    .select("id, movement_type, quantity_delta, previous_status, new_status, notes, created_at, creator:profiles(full_name)")
    .order("created_at", { ascending: false })

  query = filter.looseDiamondId ? query.eq("loose_diamond_id", filter.looseDiamondId) : query.eq("jewelry_item_id", filter.jewelryItemId)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as unknown as Array<Omit<StockMovementDetail, "createdByName"> & { creator: { full_name: string } | null }>).map(
    ({ creator, ...row }) => ({ ...row, createdByName: creator?.full_name ?? null })
  )
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
