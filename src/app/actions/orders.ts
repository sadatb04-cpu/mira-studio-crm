"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  createOrder as createOrderQuery,
  getOrders,
  markOrderDelivered as markOrderDeliveredQuery,
  ORDERS_PAGE_SIZE,
  updateOrder as updateOrderQuery,
} from "@/lib/supabase/orders"
import { orderFormSchema } from "@/lib/validations/order"
import type { OrderFormInput } from "@/lib/validations/order"
import type { OrderListItem, OrderStatus } from "@/types/order"

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
