import type { SupabaseClient } from "@supabase/supabase-js"

import { getStockStatus } from "@/types/inventory"
import type {
  DuplicateResolution,
  InventoryCategory,
  InventoryImportDuplicateMatch,
  InventoryImportRowResult,
  InventoryImportSummary,
  InventoryItemDetail,
  InventoryItemFormInput,
  InventoryItemListItem,
  InventoryItemOption,
  InventoryStats,
  InventoryTransactionDetail,
  StockStatus,
  SupplierOption,
} from "@/types/inventory"
import type { ImportSourceType } from "@/types/inventory"

const INVENTORY_ITEM_COLUMNS =
  "id, sku, name, category, unit, quantity_on_hand, minimum_stock, unit_cost, updated_at"

interface GetInventoryItemsFilters {
  search?: string
  category?: InventoryCategory
  stockStatus?: StockStatus
}

export async function getInventoryItems(
  supabase: SupabaseClient,
  filters: GetInventoryItemsFilters = {}
): Promise<InventoryItemListItem[]> {
  let query = supabase
    .from("inventory_items")
    .select(INVENTORY_ITEM_COLUMNS)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (filters.category) {
    query = query.eq("category", filters.category)
  }

  if (filters.search) {
    // Both columns live on inventory_items itself (no join), so a plain
    // .or() across them is safe and well-supported PostgREST syntax.
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const items = (data ?? []) as unknown as InventoryItemListItem[]

  if (!filters.stockStatus) return items

  return items.filter((item) => getStockStatus(item.quantity_on_hand, item.minimum_stock) === filters.stockStatus)
}

export async function getInventoryStats(supabase: SupabaseClient): Promise<InventoryStats> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand, minimum_stock, unit_cost")
    .eq("is_active", true)

  if (error) throw error

  const rows = data ?? []

  let totalValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const row of rows) {
    totalValue += row.quantity_on_hand * row.unit_cost

    const status = getStockStatus(row.quantity_on_hand, row.minimum_stock)
    if (status === "low_stock") lowStockCount += 1
    if (status === "out_of_stock") outOfStockCount += 1
  }

  return {
    totalItems: rows.length,
    totalValue,
    lowStockCount,
    outOfStockCount,
  }
}

export async function getInventoryItem(supabase: SupabaseClient, id: string): Promise<InventoryItemDetail | null> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      `${INVENTORY_ITEM_COLUMNS}, subcategory, is_active, created_at, reorder_level, selling_price, metal, purity,
       weight, stone_type, stone_weight, certificate_number, notes, supplier_id, supplier:suppliers(supplier_name)`
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { supplier, ...row } = data as unknown as InventoryItemDetail & { supplier: { supplier_name: string } | null }
  return { ...row, supplierName: supplier?.supplier_name ?? null }
}

export async function getSuppliers(supabase: SupabaseClient): Promise<SupplierOption[]> {
  const { data, error } = await supabase.from("suppliers").select("id, supplier_name").order("supplier_name")
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.supplier_name }))
}

const CATEGORY_SKU_PREFIX: Record<InventoryCategory, string> = {
  gold: "GOL",
  lab_diamond: "LDI",
  natural_diamond: "NDI",
  gemstone: "GEM",
  finding: "FND",
  packaging: "PKG",
  consumable: "CNS",
  finished_jewelry: "FJW",
}

function randomSkuSuffix(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

// Editable in the UI before saving - this only supplies a sensible,
// already-unique-enough starting point. Uniqueness is still enforced by
// the sku column's own DB constraint; callers that hit a collision (e.g.
// bulk import "Create Duplicate") should just call this again.
export async function generateSku(supabase: SupabaseClient, category: InventoryCategory): Promise<string> {
  const prefix = CATEGORY_SKU_PREFIX[category]

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${randomSkuSuffix()}`
    const { data, error } = await supabase.from("inventory_items").select("id").eq("sku", candidate).maybeSingle()
    if (error) throw error
    if (!data) return candidate
  }

  // Astronomically unlikely to ever reach this - falls back to a
  // timestamp suffix, which is unique by construction.
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export async function getInventoryItemOptions(supabase: SupabaseClient): Promise<InventoryItemOption[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, sku, unit")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as InventoryItemOption[]
}

export async function getInventoryTransactions(
  supabase: SupabaseClient,
  itemId: string
): Promise<InventoryTransactionDetail[]> {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id, transaction_type, quantity, notes, reference_type, reference_id, created_at")
    .eq("inventory_item_id", itemId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as Omit<
    InventoryTransactionDetail,
    "relatedProductionJob" | "relatedOrder"
  >[]

  const productionJobIds = rows
    .filter((row) => row.reference_type === "production_job" && row.reference_id)
    .map((row) => row.reference_id as string)

  const orderIds = rows
    .filter((row) => row.reference_type === "order" && row.reference_id)
    .map((row) => row.reference_id as string)

  const [jobsResult, ordersResult] = await Promise.all([
    productionJobIds.length > 0
      ? supabase.from("production_jobs").select("id, job_number").in("id", productionJobIds)
      : Promise.resolve({ data: [] as { id: string; job_number: string }[], error: null }),
    orderIds.length > 0
      ? supabase.from("orders").select("id, order_number").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: string; order_number: string }[], error: null }),
  ])

  if (jobsResult.error) throw jobsResult.error
  if (ordersResult.error) throw ordersResult.error

  // Resolved via best-effort lookups, not foreign keys (reference_id is
  // polymorphic and has no FK constraint) - a deleted related record simply
  // means the lookup misses and we fall back to the raw id, never an error.
  const jobMap = new Map((jobsResult.data ?? []).map((job) => [job.id, job.job_number]))
  const orderMap = new Map((ordersResult.data ?? []).map((order) => [order.id, order.order_number]))

  return rows.map((row) => ({
    ...row,
    relatedProductionJob:
      row.reference_type === "production_job" && row.reference_id
        ? { id: row.reference_id, job_number: jobMap.get(row.reference_id) ?? row.reference_id }
        : null,
    relatedOrder:
      row.reference_type === "order" && row.reference_id
        ? { id: row.reference_id, order_number: orderMap.get(row.reference_id) ?? row.reference_id }
        : null,
  }))
}

export async function consumeInventory(
  supabase: SupabaseClient,
  input: { inventory_item_id: string; quantity: number; notes?: string; production_job_id: string }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Production never touches inventory_items directly - only ever inserts a
  // transaction. The existing database trigger is the single source of
  // truth for quantity_on_hand.
  const { error } = await supabase.from("inventory_transactions").insert({
    inventory_item_id: input.inventory_item_id,
    transaction_type: "production_use",
    quantity: -Math.abs(input.quantity),
    reference_type: "production_job",
    reference_id: input.production_job_id,
    notes: input.notes ?? null,
    created_by: user?.id ?? null,
  })

  if (error) throw error
}

export async function adjustInventory(
  supabase: SupabaseClient,
  input: { inventory_item_id: string; quantity: number; direction: "increase" | "decrease"; notes?: string }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const signedQuantity = input.direction === "increase" ? Math.abs(input.quantity) : -Math.abs(input.quantity)

  const { error } = await supabase.from("inventory_transactions").insert({
    inventory_item_id: input.inventory_item_id,
    transaction_type: "adjustment",
    quantity: signedQuantity,
    reference_type: "adjustment",
    reference_id: null,
    notes: input.notes ?? null,
    created_by: user?.id ?? null,
  })

  if (error) throw error
}

// Best-effort only, matching the non-throwing activity logging pattern
// used throughout the app (e.g. logActivity() in orders.ts).
async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "inventory_item",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

interface CreateInventoryItemResult {
  id: string
}

// quantity_on_hand is trigger-maintained from inventory_transactions (see
// apply_inventory_transaction() in the 0002 migration) - "Current Stock"
// on the form seeds an initial transaction rather than being written to
// the item row directly.
export async function createInventoryItem(
  supabase: SupabaseClient,
  input: InventoryItemFormInput
): Promise<CreateInventoryItemResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      sku: input.sku,
      name: input.name,
      category: input.category,
      unit: input.unit,
      minimum_stock: input.minimumStock,
      reorder_level: input.reorderLevel,
      unit_cost: input.purchasePrice,
      selling_price: input.sellingPrice,
      supplier_id: input.supplierId || null,
      metal: input.metal || null,
      purity: input.purity || null,
      weight: input.weight ?? null,
      stone_type: input.stoneType || null,
      stone_weight: input.stoneWeight ?? null,
      certificate_number: input.certificateNumber || null,
      notes: input.notes || null,
    })
    .select("id")
    .single()

  if (error) throw error
  const id = data.id as string

  if (input.currentStock > 0) {
    const { error: txError } = await supabase.from("inventory_transactions").insert({
      inventory_item_id: id,
      transaction_type: "adjustment",
      quantity: input.currentStock,
      reference_type: "manual",
      reference_id: null,
      notes: "Initial stock recorded on item creation.",
      created_by: user?.id ?? null,
    })
    if (txError) throw txError
  }

  await logActivity(supabase, { entity_id: id, action: "created", description: `Created inventory item "${input.name}".` })

  return { id }
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

// Matches on SKU first (exact, case-insensitive), then falls back to
// Item Name + Weight (both must match) per the brief's duplicate rule.
// One query per lookup type across the whole batch, not one per row.
export async function findDuplicateInventoryItems(
  supabase: SupabaseClient,
  candidates: { sku?: string; name: string; weight?: number }[]
): Promise<Map<number, InventoryImportDuplicateMatch>> {
  const skus = [...new Set(candidates.map((c) => c.sku).filter((sku): sku is string => !!sku))]

  const { data: bySku, error: skuError } = await supabase
    .from("inventory_items")
    .select("id, name, sku, weight")
    .in("sku", skus.length > 0 ? skus : ["__none__"])

  if (skuError) throw skuError

  const namesWithWeight = [...new Set(candidates.filter((c) => c.weight !== undefined).map((c) => c.name))]

  const { data: byName, error: nameError } =
    namesWithWeight.length > 0
      ? await supabase.from("inventory_items").select("id, name, sku, weight").in("name", namesWithWeight)
      : { data: [] as { id: string; name: string; sku: string; weight: number | null }[], error: null }

  if (nameError) throw nameError

  const skuMap = new Map((bySku ?? []).map((row) => [row.sku.toLowerCase(), row]))
  const nameWeightMap = new Map((byName ?? []).map((row) => [`${row.name.toLowerCase()}::${row.weight ?? ""}`, row]))

  const result = new Map<number, InventoryImportDuplicateMatch>()

  candidates.forEach((candidate, index) => {
    const skuMatch = candidate.sku ? skuMap.get(candidate.sku.toLowerCase()) : undefined
    const match =
      skuMatch ?? (candidate.weight !== undefined ? nameWeightMap.get(`${candidate.name.toLowerCase()}::${candidate.weight}`) : undefined)

    if (match) {
      result.set(index, { id: match.id, name: match.name, sku: match.sku })
    }
  })

  return result
}

export interface ResolvedImportRow {
  rowIndex: number
  input: InventoryItemFormInput
  duplicateId: string | null
  resolution: DuplicateResolution
}

// Processes one chunk of already-mapped, already-validated, already
// duplicate-resolved rows. Called repeatedly by the client (in batches) so
// the wizard can show real incremental progress rather than one opaque
// all-or-nothing call.
export async function bulkImportInventoryRows(
  supabase: SupabaseClient,
  rows: ResolvedImportRow[]
): Promise<InventoryImportRowResult[]> {
  const results: InventoryImportRowResult[] = []

  for (const row of rows) {
    try {
      if (row.duplicateId && row.resolution === "skip") {
        results.push({ rowIndex: row.rowIndex, status: "skipped" })
        continue
      }

      if (row.duplicateId && row.resolution === "update") {
        const { error } = await supabase
          .from("inventory_items")
          .update({
            name: row.input.name,
            category: row.input.category,
            unit: row.input.unit,
            minimum_stock: row.input.minimumStock,
            reorder_level: row.input.reorderLevel,
            unit_cost: row.input.purchasePrice,
            selling_price: row.input.sellingPrice,
            supplier_id: row.input.supplierId || null,
            metal: row.input.metal || null,
            purity: row.input.purity || null,
            weight: row.input.weight ?? null,
            stone_type: row.input.stoneType || null,
            stone_weight: row.input.stoneWeight ?? null,
            certificate_number: row.input.certificateNumber || null,
            notes: row.input.notes || null,
          })
          .eq("id", row.duplicateId)

        if (error) throw error

        // Reconcile stock via a delta transaction rather than overwriting
        // quantity_on_hand directly - it stays fully derived from the
        // ledger, same invariant as everywhere else in this module.
        const { data: existing, error: fetchError } = await supabase
          .from("inventory_items")
          .select("quantity_on_hand")
          .eq("id", row.duplicateId)
          .single()
        if (fetchError) throw fetchError

        const delta = row.input.currentStock - Number(existing.quantity_on_hand)
        if (delta !== 0) {
          const { error: txError } = await supabase.from("inventory_transactions").insert({
            inventory_item_id: row.duplicateId,
            transaction_type: "adjustment",
            quantity: delta,
            reference_type: "manual",
            reference_id: null,
            notes: "Stock reconciled from bulk import.",
          })
          if (txError) throw txError
        }

        await logActivity(supabase, {
          entity_id: row.duplicateId,
          action: "updated",
          description: `Updated "${row.input.name}" via bulk import.`,
        })
        results.push({ rowIndex: row.rowIndex, status: "updated" })
        continue
      }

      // Either no duplicate, or the user explicitly chose "Create Duplicate".
      // A blank sku (not provided by the source file) or an explicit
      // "create duplicate" choice (which can't reuse the matched sku,
      // since sku is unique) both need a freshly generated one.
      let sku = row.input.sku
      if (!sku || (row.duplicateId && row.resolution === "create_duplicate")) {
        sku = await generateSku(supabase, row.input.category)
      }

      const created = await createInventoryItem(supabase, { ...row.input, sku })
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

export async function recordImportBatch(
  supabase: SupabaseClient,
  input: {
    sourceType: ImportSourceType
    sourceName: string
    googleSheetUrl?: string
    summary: InventoryImportSummary
  }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("inventory_import_batches").insert({
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
