import type { SupabaseClient } from "@supabase/supabase-js"

import { recordStockMovement, logInventoryActivity } from "@/lib/supabase/inventory-shared"
import { getJewelryStockLevel } from "@/types/jewelry"
import type { DuplicateResolution, ImportRowResult } from "@/types/import"
import type {
  AdjustJewelryStockInput,
  JewelryDetail,
  JewelryFormInput,
  JewelryListItem,
  JewelryStats,
  JewelryStatus,
} from "@/types/jewelry"

const JEWELRY_LIST_COLUMNS = "id, sku, product_name, category, metal, quantity, reorder_level, cost, selling_price, status, updated_at"

export interface GetJewelryItemsFilters {
  search?: string
  category?: string
  status?: JewelryStatus
  stockLevel?: "in_stock" | "low_stock" | "out_of_stock"
}

export async function getJewelryItems(
  supabase: SupabaseClient,
  filters: GetJewelryItemsFilters = {}
): Promise<JewelryListItem[]> {
  let query = supabase.from("jewelry_inventory").select(JEWELRY_LIST_COLUMNS).eq("is_active", true).order("created_at", { ascending: false })

  if (filters.category) query = query.eq("category", filters.category)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.search) {
    query = query.or(`sku.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const items = (data ?? []) as unknown as JewelryListItem[]
  if (!filters.stockLevel) return items

  return items.filter((item) => getJewelryStockLevel(item.quantity, item.reorder_level) === filters.stockLevel)
}

export async function getJewelryStats(supabase: SupabaseClient): Promise<JewelryStats> {
  const { data, error } = await supabase.from("jewelry_inventory").select("quantity, reorder_level, cost").eq("is_active", true)
  if (error) throw error

  const rows = data ?? []
  let totalPieces = 0
  let totalValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const row of rows) {
    totalPieces += Number(row.quantity)
    totalValue += Number(row.quantity) * Number(row.cost)

    const level = getJewelryStockLevel(Number(row.quantity), Number(row.reorder_level))
    if (level === "low_stock") lowStockCount += 1
    if (level === "out_of_stock") outOfStockCount += 1
  }

  return { totalProducts: rows.length, totalPieces, totalValue, lowStockCount, outOfStockCount }
}

export async function getJewelryItem(supabase: SupabaseClient, id: string): Promise<JewelryDetail | null> {
  const { data, error } = await supabase
    .from("jewelry_inventory")
    .select(
      `${JEWELRY_LIST_COLUMNS}, metal_purity, diamond_type, diamond_weight, gross_weight, net_weight, location, notes,
       is_active, created_at, supplier_id, supplier:suppliers(supplier_name)`
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { supplier, ...row } = data as unknown as JewelryDetail & { supplier: { supplier_name: string } | null }
  return { ...row, supplierName: supplier?.supplier_name ?? null }
}

interface CreateJewelryItemResult {
  id: string
}

export async function createJewelryItem(supabase: SupabaseClient, input: JewelryFormInput): Promise<CreateJewelryItemResult> {
  const { data, error } = await supabase
    .from("jewelry_inventory")
    .insert({
      sku: input.sku,
      product_name: input.productName,
      category: input.category || null,
      metal: input.metal || null,
      metal_purity: input.metalPurity || null,
      diamond_type: input.diamondType || null,
      diamond_weight: input.diamondWeight ?? null,
      gross_weight: input.grossWeight ?? null,
      net_weight: input.netWeight ?? null,
      cost: input.cost,
      selling_price: input.sellingPrice,
      reorder_level: input.reorderLevel,
      status: input.status,
      location: input.location || null,
      supplier_id: input.supplierId || null,
      notes: input.notes || null,
    })
    .select("id")
    .single()

  if (error) throw error
  const id = data.id as string

  if (input.currentStock > 0) {
    await recordStockMovement(supabase, {
      jewelryItemId: id,
      movementType: "initial",
      quantityDelta: input.currentStock,
      notes: "Initial stock recorded on item creation.",
    })
  }

  await logInventoryActivity(supabase, {
    entityType: "jewelry_item",
    entityId: id,
    action: "created",
    description: `Added jewelry item "${input.productName}" (${input.sku}) to inventory.`,
  })

  return { id }
}

// status is directly editable here (unlike Loose Diamonds, where status
// always goes through a dedicated dialog) since Jewelry's status is a
// general business attribute (active/discontinued/etc), not a workflow
// the business tracks transition history for the way diamond reservations
// are. Quantity is never written here - it only ever changes via a stock
// movement (see adjustJewelryStock below).
export async function updateJewelryItem(supabase: SupabaseClient, id: string, input: JewelryFormInput): Promise<void> {
  const { error } = await supabase
    .from("jewelry_inventory")
    .update({
      sku: input.sku,
      product_name: input.productName,
      category: input.category || null,
      metal: input.metal || null,
      metal_purity: input.metalPurity || null,
      diamond_type: input.diamondType || null,
      diamond_weight: input.diamondWeight ?? null,
      gross_weight: input.grossWeight ?? null,
      net_weight: input.netWeight ?? null,
      cost: input.cost,
      selling_price: input.sellingPrice,
      reorder_level: input.reorderLevel,
      status: input.status,
      location: input.location || null,
      supplier_id: input.supplierId || null,
      notes: input.notes || null,
    })
    .eq("id", id)

  if (error) throw error

  await logInventoryActivity(supabase, {
    entityType: "jewelry_item",
    entityId: id,
    action: "updated",
    description: `Updated jewelry item "${input.productName}" (${input.sku}).`,
  })
}

export async function adjustJewelryStock(supabase: SupabaseClient, input: AdjustJewelryStockInput): Promise<void> {
  const signedQuantity = input.direction === "increase" ? Math.abs(input.quantity) : -Math.abs(input.quantity)

  await recordStockMovement(supabase, {
    jewelryItemId: input.jewelryItemId,
    movementType: "adjustment",
    quantityDelta: signedQuantity,
    notes: input.notes,
  })

  await logInventoryActivity(supabase, {
    entityType: "jewelry_item",
    entityId: input.jewelryItemId,
    action: "stock_adjusted",
    description: `Stock ${input.direction === "increase" ? "increased" : "decreased"} by ${Math.abs(input.quantity)}.`,
  })
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export interface ResolvedJewelryImportRow {
  rowIndex: number
  input: JewelryFormInput
  duplicateId: string | null
  resolution: DuplicateResolution
}

export async function bulkImportJewelryItems(supabase: SupabaseClient, rows: ResolvedJewelryImportRow[]): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = []

  for (const row of rows) {
    try {
      if (row.duplicateId && row.resolution === "skip") {
        results.push({ rowIndex: row.rowIndex, status: "skipped" })
        continue
      }

      if (row.duplicateId && row.resolution === "update") {
        await updateJewelryItem(supabase, row.duplicateId, row.input)

        // Reconcile stock via a delta movement rather than overwriting
        // quantity directly - it stays fully derived from the ledger.
        const { data: existing, error: fetchError } = await supabase
          .from("jewelry_inventory")
          .select("quantity")
          .eq("id", row.duplicateId)
          .single()
        if (fetchError) throw fetchError

        const delta = row.input.currentStock - Number(existing.quantity)
        if (delta !== 0) {
          await recordStockMovement(supabase, {
            jewelryItemId: row.duplicateId,
            movementType: "adjustment",
            quantityDelta: delta,
            notes: "Stock reconciled from bulk import.",
          })
        }

        results.push({ rowIndex: row.rowIndex, status: "updated" })
        continue
      }

      // Either no duplicate, or the user explicitly chose "Create
      // Duplicate" - a mistyped/reused SKU can legitimately mean two
      // different physical pieces, unlike a diamond's Report Number.
      let sku = row.input.sku
      if (row.duplicateId && row.resolution === "create_duplicate") {
        sku = `${sku}-${Date.now().toString(36).toUpperCase()}`
      }

      const created = await createJewelryItem(supabase, { ...row.input, sku })
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
