import type { SupabaseClient } from "@supabase/supabase-js"

import { getStockStatus } from "@/types/inventory"
import type {
  InventoryCategory,
  InventoryItemDetail,
  InventoryItemListItem,
  InventoryItemOption,
  InventoryStats,
  InventoryTransactionDetail,
  StockStatus,
} from "@/types/inventory"

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
    .select(`${INVENTORY_ITEM_COLUMNS}, subcategory, is_active, created_at`)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as InventoryItemDetail | null
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
