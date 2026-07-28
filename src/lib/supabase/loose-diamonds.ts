import type { SupabaseClient } from "@supabase/supabase-js"

import { recordStockMovement, logInventoryActivity } from "@/lib/supabase/inventory-shared"
import type { DuplicateResolution, ImportRowResult } from "@/types/import"
import type { LooseDiamondDetail, LooseDiamondFormInput, LooseDiamondListItem, LooseDiamondStats, LooseDiamondStatus } from "@/types/loose-diamond"

const LOOSE_DIAMOND_LIST_COLUMNS =
  "id, report_number, lab, shape, carat, color, clarity, growth_type, cost_usd, selling_price, status, updated_at"

export interface GetLooseDiamondsFilters {
  search?: string
  shape?: string
  color?: string
  clarity?: string
  growthType?: string
  lab?: string
  status?: LooseDiamondStatus
  minCarat?: number
  maxCarat?: number
}

export async function getLooseDiamonds(
  supabase: SupabaseClient,
  filters: GetLooseDiamondsFilters = {}
): Promise<LooseDiamondListItem[]> {
  let query = supabase
    .from("loose_diamonds")
    .select(LOOSE_DIAMOND_LIST_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (filters.shape) query = query.eq("shape", filters.shape)
  if (filters.color) query = query.eq("color", filters.color)
  if (filters.clarity) query = query.eq("clarity", filters.clarity)
  if (filters.growthType) query = query.eq("growth_type", filters.growthType)
  if (filters.lab) query = query.eq("lab", filters.lab)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.minCarat !== undefined) query = query.gte("carat", filters.minCarat)
  if (filters.maxCarat !== undefined) query = query.lte("carat", filters.maxCarat)

  if (filters.search) {
    // Report Number is the primary "instant search" target (pg_trgm GIN
    // index makes ilike substring matching fast); Shape/Color/Clarity are
    // included too since the brief calls them out as searchable.
    query = query.or(
      `report_number.ilike.%${filters.search}%,shape.ilike.%${filters.search}%,color.ilike.%${filters.search}%,clarity.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as LooseDiamondListItem[]
}

export async function getLooseDiamondStats(supabase: SupabaseClient): Promise<LooseDiamondStats> {
  const { data, error } = await supabase
    .from("loose_diamonds")
    .select("carat, cost_usd, status, created_at")
    .eq("is_active", true)

  if (error) throw error

  const rows = data ?? []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let totalCarats = 0
  let totalValue = 0
  let availableCount = 0
  let reservedCount = 0
  let soldCount = 0
  let recentlyAddedCount = 0

  for (const row of rows) {
    totalCarats += Number(row.carat)
    totalValue += Number(row.cost_usd)
    if (row.status === "available") availableCount += 1
    if (row.status === "reserved") reservedCount += 1
    if (row.status === "sold") soldCount += 1
    if (new Date(row.created_at) >= sevenDaysAgo) recentlyAddedCount += 1
  }

  return {
    totalStones: rows.length,
    totalCarats,
    totalValue,
    averageCostPerCarat: totalCarats > 0 ? totalValue / totalCarats : 0,
    averageCarat: rows.length > 0 ? totalCarats / rows.length : 0,
    availableCount,
    reservedCount,
    soldCount,
    recentlyAddedCount,
  }
}

export async function getLooseDiamond(supabase: SupabaseClient, id: string): Promise<LooseDiamondDetail | null> {
  const { data, error } = await supabase
    .from("loose_diamonds")
    .select(
      `${LOOSE_DIAMOND_LIST_COLUMNS}, cut, polish, symmetry, fluorescence, country_of_origin, notes, date_added,
       is_active, created_at, supplier_id, supplier:suppliers(supplier_name)`
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { supplier, ...row } = data as unknown as LooseDiamondDetail & { supplier: { supplier_name: string } | null }
  return { ...row, supplierName: supplier?.supplier_name ?? null }
}

interface CreateLooseDiamondResult {
  id: string
}

export async function createLooseDiamond(
  supabase: SupabaseClient,
  input: LooseDiamondFormInput
): Promise<CreateLooseDiamondResult> {
  const { data, error } = await supabase
    .from("loose_diamonds")
    .insert({
      report_number: input.reportNumber,
      lab: input.lab || null,
      shape: input.shape || null,
      carat: input.carat,
      color: input.color || null,
      clarity: input.clarity || null,
      cut: input.cut || null,
      polish: input.polish || null,
      symmetry: input.symmetry || null,
      fluorescence: input.fluorescence || null,
      growth_type: input.growthType || null,
      country_of_origin: input.countryOfOrigin || null,
      cost_usd: input.costUsd,
      selling_price: input.sellingPrice,
      status: input.status,
      supplier_id: input.supplierId || null,
      notes: input.notes || null,
    })
    .select("id")
    .single()

  if (error) throw error
  const id = data.id as string

  // Snapshot the starting status as an `initial` movement, so every
  // diamond's ledger has a first entry rather than starting blank.
  await recordStockMovement(supabase, {
    looseDiamondId: id,
    movementType: "initial",
    newStatus: input.status,
    notes: "Added to inventory.",
  })

  await logInventoryActivity(supabase, {
    entityType: "loose_diamond",
    entityId: id,
    action: "created",
    description: `Added loose diamond ${input.reportNumber} to inventory.`,
  })

  return { id }
}

export async function updateLooseDiamond(
  supabase: SupabaseClient,
  id: string,
  input: LooseDiamondFormInput
): Promise<void> {
  const { error } = await supabase
    .from("loose_diamonds")
    .update({
      report_number: input.reportNumber,
      lab: input.lab || null,
      shape: input.shape || null,
      carat: input.carat,
      color: input.color || null,
      clarity: input.clarity || null,
      cut: input.cut || null,
      polish: input.polish || null,
      symmetry: input.symmetry || null,
      fluorescence: input.fluorescence || null,
      growth_type: input.growthType || null,
      country_of_origin: input.countryOfOrigin || null,
      cost_usd: input.costUsd,
      selling_price: input.sellingPrice,
      supplier_id: input.supplierId || null,
      notes: input.notes || null,
      // status is intentionally excluded here - status transitions always
      // go through updateLooseDiamondStatus() so they're captured as a
      // movement, never silently overwritten by a general edit.
    })
    .eq("id", id)

  if (error) throw error

  await logInventoryActivity(supabase, {
    entityType: "loose_diamond",
    entityId: id,
    action: "updated",
    description: `Updated loose diamond ${input.reportNumber}.`,
  })
}

export async function updateLooseDiamondStatus(
  supabase: SupabaseClient,
  input: { looseDiamondId: string; previousStatus: LooseDiamondStatus; newStatus: LooseDiamondStatus; notes?: string }
): Promise<void> {
  await recordStockMovement(supabase, {
    looseDiamondId: input.looseDiamondId,
    movementType: "status_change",
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    notes: input.notes,
  })

  await logInventoryActivity(supabase, {
    entityType: "loose_diamond",
    entityId: input.looseDiamondId,
    action: "status_changed",
    description: `Status changed from ${input.previousStatus} to ${input.newStatus}.`,
  })
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export interface ResolvedLooseDiamondImportRow {
  rowIndex: number
  input: LooseDiamondFormInput
  duplicateId: string | null
  resolution: DuplicateResolution
}

// Report Number is a real-world natural key (assigned by the grading lab),
// not a generated code - so unlike Jewelry's SKU, there is no meaningful
// "create a duplicate anyway" case. Both "update" and "create_duplicate"
// resolve to updating the existing row, matching the brief's "Loose
// diamonds should never create duplicates."
export async function bulkImportLooseDiamonds(
  supabase: SupabaseClient,
  rows: ResolvedLooseDiamondImportRow[]
): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = []

  for (const row of rows) {
    try {
      if (row.duplicateId && row.resolution === "skip") {
        results.push({ rowIndex: row.rowIndex, status: "skipped" })
        continue
      }

      if (row.duplicateId) {
        await updateLooseDiamond(supabase, row.duplicateId, row.input)
        results.push({ rowIndex: row.rowIndex, status: "updated" })
        continue
      }

      const created = await createLooseDiamond(supabase, row.input)
      results.push({ rowIndex: row.rowIndex, status: "created", message: created.id })
    } catch (error) {
      results.push({
        rowIndex: row.rowIndex,
        status: "error",
        message: error instanceof Error ? error.message : "Unable to import this row.",
      })
    }
  }

  return results
}
