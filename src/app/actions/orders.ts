"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import { findDuplicatesByKey, recordInventoryImportBatch } from "@/lib/supabase/inventory-shared"
import {
  bulkImportOrders,
  createOrder as createOrderQuery,
  getOrders,
  markOrderDelivered as markOrderDeliveredQuery,
  ORDERS_PAGE_SIZE,
  updateOrder as updateOrderQuery,
} from "@/lib/supabase/orders"
import type { ResolvedOrderImportRow } from "@/lib/supabase/orders"
import { orderFormSchema, orderImportInputSchema } from "@/lib/validations/order"
import type { OrderFormInput } from "@/lib/validations/order"
import type { OrderListItem, OrderStatus } from "@/types/order"
import type { ImportDuplicateMatch, ImportRowResult, ImportSourceType, ImportSummary } from "@/types/import"

export interface OrderActionState {
  error?: string
}

export interface LoadMoreOrdersResult {
  orders: OrderListItem[]
  hasMore: boolean
}

// Backs the Orders list page's "Load More" button. Search results are
// returned in full on the first load (getOrders' search path can't be
// range-paginated - see orders.ts), so this is only meaningful when no
// search term is active; the page never calls it with one.
export async function loadMoreOrders(
  filters: { status?: OrderStatus },
  offset: number
): Promise<LoadMoreOrdersResult> {
  const supabase = await createClient()
  const rows = await getOrders(supabase, { ...filters, limit: ORDERS_PAGE_SIZE, offset })
  const hasMore = rows.length > ORDERS_PAGE_SIZE

  return { orders: rows.slice(0, ORDERS_PAGE_SIZE), hasMore }
}

function toWriteInput(validated: OrderFormInput) {
  return {
    customer_id: validated.customer_id,
    due_date: validated.due_date || null,
    notes: validated.notes || null,
    product_name: validated.product_name,
    files: validated.files.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_url: file.file_url ?? "",
      file_type: file.file_type,
      file_size: file.file_size,
    })),
  }
}

export async function createOrder(input: OrderFormInput): Promise<OrderActionState> {
  const validated = orderFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let orderId: string
  try {
    await requireModulePermission(supabase, "orders", "create")
    orderId = await createOrderQuery(supabase, toWriteInput(validated.data))
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create order." }
  }

  redirect(`/orders/${orderId}`)
}

export async function updateOrder(orderId: string, input: OrderFormInput): Promise<OrderActionState> {
  const validated = orderFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "orders", "edit")
    await updateOrderQuery(supabase, orderId, toWriteInput(validated.data))
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update order." }
  }

  redirect(`/orders/${orderId}`)
}

export async function markOrderDelivered(orderId: string): Promise<OrderActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "orders", "edit")
    await markOrderDeliveredQuery(supabase, orderId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to mark this order as delivered." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}

// ---------------------------------------------------------------------------
// Order Import wizard - reuses the generalized inventory-import engine
// (components/inventory-import/import-wizard.tsx). See order-import-config.ts
// for field definitions/validation/normalization; this file only wires the
// three server actions the shared wizard needs, exactly like
// actions/loose-diamonds.ts and actions/jewelry.ts already do for their
// categories.
// ---------------------------------------------------------------------------

export interface FindOrderDuplicatesResult {
  matches?: Record<number, ImportDuplicateMatch>
  error?: string
}

export async function findOrderImportDuplicates(
  candidates: { rowIndex: number; orderNumber: string }[]
): Promise<FindOrderDuplicatesResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "orders", "create")
    const found = await findDuplicatesByKey(
      supabase,
      "orders",
      "order_number",
      candidates.map((c) => c.orderNumber)
    )

    const matches: Record<number, ImportDuplicateMatch> = {}
    candidates.forEach((candidate) => {
      const id = found.get(candidate.orderNumber.toLowerCase())
      if (id) matches[candidate.rowIndex] = { id, label: candidate.orderNumber }
    })
    return { matches }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to check for duplicates." }
  }
}

export interface ImportOrdersChunkResult {
  results?: ImportRowResult[]
  error?: string
}

// A brand-new customer may need to be created for any row (see
// resolveOrCreateCustomer in orders.ts), so this requires both orders:create
// and customers:create up front - the same permission an order created via
// the manual form's "quick add new customer" would require.
export async function importOrdersChunk(rows: ResolvedOrderImportRow[]): Promise<ImportOrdersChunkResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "orders", "create")
    await requireModulePermission(supabase, "customers", "create")

    for (const row of rows) {
      const validated = orderImportInputSchema.safeParse(row.input)
      if (!validated.success) {
        return { error: "One or more rows failed validation unexpectedly. Please re-check the preview." }
      }
    }

    const results = await bulkImportOrders(supabase, rows)
    return { results }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to import this batch." }
  }
}

export async function recordOrderImportBatchAction(input: {
  sourceType: ImportSourceType
  sourceName: string
  googleSheetUrl?: string
  summary: ImportSummary
}): Promise<OrderActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "orders", "create")
    await recordInventoryImportBatch(supabase, { ...input, category: "orders" })
    revalidatePath("/orders")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record the import summary." }
  }
}
