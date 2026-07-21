import type { SupabaseClient } from "@supabase/supabase-js"

import { ORDER_STATUSES } from "@/types/order"
import type { OrderListItem, OrderStatus, OrderStatusCounts } from "@/types/order"

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
