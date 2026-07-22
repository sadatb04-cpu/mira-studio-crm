import type { SupabaseClient } from "@supabase/supabase-js"

import { ORDER_STATUSES } from "@/types/order"
import type {
  CustomerOption,
  OrderDetail,
  OrderItemSpecifications,
  OrderListItem,
  OrderStatus,
  OrderStatusCounts,
} from "@/types/order"
import type { Json } from "@/types/database"

interface GetOrdersFilters {
  status?: OrderStatus
  search?: string
}

const ORDER_COLUMNS =
  "id, order_number, status, order_date, due_date, total, currency, created_at, order_items(count)"

export async function getOrders(supabase: SupabaseClient, filters: GetOrdersFilters = {}) {
  if (filters.search) {
    // PostgREST can't OR a root column (order_number) with a joined column
    // (customers.full_name) in a single query, so we run both filters as
    // separate queries and merge the results.
    const pattern = `%${filters.search}%`

    let byNumber = supabase
      .from("orders")
      .select(`${ORDER_COLUMNS}, customer:customers(full_name)`)
      .ilike("order_number", pattern)

    let byCustomer = supabase
      .from("orders")
      .select(`${ORDER_COLUMNS}, customer:customers!inner(full_name)`)
      .ilike("customer.full_name", pattern)

    if (filters.status) {
      byNumber = byNumber.eq("status", filters.status)
      byCustomer = byCustomer.eq("status", filters.status)
    }

    const [numberResult, customerResult] = await Promise.all([byNumber, byCustomer])
    if (numberResult.error) throw numberResult.error
    if (customerResult.error) throw customerResult.error

    const merged = new Map<string, OrderListItem>()
    for (const row of [...numberResult.data, ...customerResult.data] as unknown as OrderListItem[]) {
      merged.set(row.id, row)
    }

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  let query = supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, customer:customers(full_name)`)
    .order("created_at", { ascending: false })

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as OrderListItem[]
}

export async function getOrderStatusCounts(supabase: SupabaseClient): Promise<OrderStatusCounts> {
  const { data, error } = await supabase.from("orders").select("status")
  if (error) throw error

  const counts = ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = 0
    return acc
  }, {} as OrderStatusCounts)

  for (const row of data ?? []) {
    counts[row.status as OrderStatus] += 1
  }

  return counts
}

export async function getOrderById(supabase: SupabaseClient, id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, order_date, due_date, notes, subtotal, tax, shipping_cost, total, currency, created_at, customer:customers(id, full_name, company_name, email, phone), order_items(id, description, specifications, quantity, unit_price, total_price)"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as OrderDetail | null
}

export async function getCustomers(supabase: SupabaseClient): Promise<CustomerOption[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, company_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true })

  if (error) throw error
  return (data ?? []) as CustomerOption[]
}

interface CreateOrderItemInput {
  description: string
  specifications: OrderItemSpecifications
  quantity: number
  unit_price: number
}

interface CreateOrderInput {
  customer_id: string
  due_date: string | null
  notes: string | null
  items: CreateOrderItemInput[]
}

export async function createOrder(supabase: SupabaseClient, input: CreateOrderInput): Promise<string> {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customer_id,
      due_date: input.due_date,
      notes: input.notes,
      subtotal,
      tax: 0,
      shipping_cost: 0,
      total: subtotal,
    })
    .select("id")
    .single()

  if (orderError) throw orderError

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id as string,
      description: item.description,
      specifications: item.specifications as Json,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
  )

  if (itemsError) {
    // Roll back the order so we don't leave an item-less order behind.
    await supabase.from("orders").delete().eq("id", order.id)
    throw itemsError
  }

  const orderId = order.id as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Logged so it can surface as "Orders placed" on the customer's timeline.
  // Deliberately not thrown on failure - the order itself was created
  // successfully, and a secondary audit-log write shouldn't roll that back.
  await supabase.from("activity_logs").insert({
    entity_type: "order",
    entity_id: orderId,
    action: "created",
    description: "Order created.",
    actor_id: user?.id ?? null,
  })
  // (error intentionally ignored - see comment above)

  return orderId
}
