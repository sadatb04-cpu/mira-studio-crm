import type { SupabaseClient } from "@supabase/supabase-js"

import { ORDER_STATUSES } from "@/types/order"
import type {
  CustomerOption,
  OrderDetail,
  OrderFile,
  OrderItemSpecifications,
  OrderListItem,
  OrderStatus,
  OrderStatusCounts,
  OrderStone,
  OrderTimelineEvent,
} from "@/types/order"

const DOCUMENTS_BUCKET = "documents"
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10

interface GetOrdersFilters {
  status?: OrderStatus
  search?: string
  /** Due date has passed and the order hasn't been delivered or cancelled. */
  overdue?: boolean
}

const ORDER_COLUMNS =
  "id, order_number, status, order_date, due_date, total, currency, created_at, order_items(count), order_stones(count)"

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

    if (filters.overdue) {
      const today = new Date().toISOString().slice(0, 10)
      byNumber = byNumber.lt("due_date", today).not("status", "in", "(delivered,cancelled)")
      byCustomer = byCustomer.lt("due_date", today).not("status", "in", "(delivered,cancelled)")
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

  if (filters.overdue) {
    const today = new Date().toISOString().slice(0, 10)
    query = query.lt("due_date", today).not("status", "in", "(delivered,cancelled)")
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

interface RawOrderItemRow {
  id: string
  description: string
  specifications: OrderItemSpecifications
  quantity: number
  unit_price: number
  total_price: number | null
  created_at: string
}

interface RawOrderFileRow {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
  uploader: { full_name: string } | null
}

export async function getOrderById(supabase: SupabaseClient, id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, order_date, due_date, notes, subtotal, tax, shipping_cost, total, currency, created_at,
      customer_id, customer:customers(id, full_name, company_name, email, phone),
      order_items(id, description, specifications, quantity, unit_price, total_price, created_at),
      order_stones(id, stone_type, shape, quantity, mm_size, carat_weight, color, clarity, notes),
      order_files(id, file_name, file_url, file_type, file_size, created_at, uploader:profiles!order_files_uploaded_by_fkey(full_name))`
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // PostgREST doesn't guarantee embedded-array order, so this is sorted
  // explicitly to match updateOrder()'s own "earliest item" query - both
  // must agree on which row is "the" product for a multi-item legacy order.
  const rawItems = ((data.order_items ?? []) as unknown as RawOrderItemRow[])
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const rawFiles = (data.order_files ?? []) as unknown as RawOrderFileRow[]

  const filesWithSignedUrls: OrderFile[] = await Promise.all(
    rawFiles.map(async (file) => {
      const { data: signedData } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(file.file_url, SIGNED_URL_EXPIRY_SECONDS)

      return {
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type,
        file_size: file.file_size,
        created_at: file.created_at,
        uploadedByName: file.uploader?.full_name ?? null,
        signedUrl: signedData?.signedUrl ?? null,
      }
    })
  )

  return {
    id: data.id,
    order_number: data.order_number,
    status: data.status,
    order_date: data.order_date,
    due_date: data.due_date,
    notes: data.notes,
    subtotal: data.subtotal,
    tax: data.tax,
    shipping_cost: data.shipping_cost,
    total: data.total,
    currency: data.currency,
    created_at: data.created_at,
    customer_id: data.customer_id,
    customer: data.customer as unknown as OrderDetail["customer"],
    productName: rawItems[0]?.description ?? "",
    order_items: rawItems.map((item) => ({
      id: item.id,
      description: item.description,
      specifications: item.specifications,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    })),
    stones: (data.order_stones ?? []) as unknown as OrderStone[],
    files: filesWithSignedUrls,
  }
}

export async function getOrderTimeline(supabase: SupabaseClient, orderId: string): Promise<OrderTimelineEvent[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, description, created_at")
    .eq("entity_type", "order")
    .eq("entity_id", orderId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as OrderTimelineEvent[]
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

interface OrderFileInput {
  id?: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
}

interface OrderWriteInput {
  customer_id: string
  due_date: string | null
  notes: string | null
  product_name: string
  files: OrderFileInput[]
}

// Exported for reuse by quotations.ts - quotation activity (create/update/
// delete/status changes) logs against the same order entity/timeline
// rather than introducing a separate entity_type, keeping everything
// visible in the order detail page's single Activity Timeline.
export async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "order",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

// Sprint 4.1.3 (Order Workflow & Status Automation) - the single place every
// automatic order-status transition goes through. Guarded by fromStatuses so
// it's a no-op (and does NOT log) unless the order is actually in one of the
// expected prior stages - this is what makes it safe to call from multiple
// call sites (quotations.ts, production.ts) without producing a stray
// transition or a duplicate log for an order that's already moved on.
export async function advanceOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  fromStatuses: OrderStatus[],
  toStatus: OrderStatus,
  action: string,
  description: string
): Promise<void> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: toStatus })
    .eq("id", orderId)
    .in("status", fromStatuses)
    .select("id")

  if (error) throw error

  if (data && data.length > 0) {
    await logActivity(supabase, { entity_id: orderId, action, description })
  }
}

// Sprint 4.1.3 - the one manual step in the automated workflow (there is no
// existing trigger for this transition anywhere in the app to reuse). Unlike
// advanceOrderStatus()'s other, side-effect call sites, this is a direct,
// deliberate user action, so an invalid transition throws instead of
// silently no-op'ing.
export async function markOrderDelivered(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data: order, error } = await supabase.from("orders").select("status").eq("id", orderId).single()
  if (error) throw error

  if (order.status !== "ready_for_delivery") {
    throw new Error("This order is not ready for delivery yet.")
  }

  await advanceOrderStatus(supabase, orderId, ["ready_for_delivery"], "delivered", "status_delivered", "Delivered.")
}

// Simplified order creation (Sprint "Simplify Order Creation") - just the
// order row plus a single order_item carrying the product name. quantity/
// unit_price default to placeholders (1 / 0); pricing and stone/spec detail
// get filled in later by Sales/CAD/Production against this same item row.
export async function createOrder(supabase: SupabaseClient, input: OrderWriteInput): Promise<string> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customer_id,
      due_date: input.due_date,
      notes: input.notes,
      subtotal: 0,
      tax: 0,
      shipping_cost: 0,
      total: 0,
    })
    .select("id")
    .single()

  if (orderError) throw orderError
  const orderId = order.id as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: orderId,
      description: input.product_name,
      specifications: {},
      quantity: 1,
      unit_price: 0,
    })
    if (itemError) throw itemError

    if (input.files.length > 0) {
      const { error: filesError } = await supabase.from("order_files").insert(
        input.files.map((file) => ({
          order_id: orderId,
          file_name: file.file_name,
          file_url: file.file_url,
          file_type: file.file_type,
          file_size: file.file_size,
          uploaded_by: user?.id ?? null,
        }))
      )
      if (filesError) throw filesError
    }
  } catch (error) {
    // order_items/order_files cascade-delete via their order_id FK, so
    // removing the order alone cleans up every DB row from this failed
    // submission. Storage objects for any files already uploaded aren't
    // covered by that cascade, so they're removed here too.
    await supabase.from("orders").delete().eq("id", orderId)
    if (input.files.length > 0) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove(input.files.map((file) => file.file_url))
    }
    throw error
  }

  await logActivity(supabase, { entity_id: orderId, action: "created", description: "Order created." })
  // (logActivity errors are swallowed inside it - see its own comment)

  return orderId
}

// Simplified order update - customer/due date/requirements, the single
// product item's description, and reference files. Deliberately never
// touches subtotal/tax/shipping_cost/total or the item's
// quantity/unit_price/specifications, since those are populated later by
// Sales/CAD/Production and must survive an unrelated "rename the product" edit.
export async function updateOrder(supabase: SupabaseClient, orderId: string, input: OrderWriteInput): Promise<void> {
  const [itemResult, filesResult] = await Promise.all([
    supabase.from("order_items").select("id").eq("order_id", orderId).order("created_at").limit(1).maybeSingle(),
    supabase.from("order_files").select("id, file_url").eq("order_id", orderId),
  ])

  if (itemResult.error) throw itemResult.error
  if (filesResult.error) throw filesResult.error

  const existingFiles = filesResult.data ?? []

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      customer_id: input.customer_id,
      due_date: input.due_date,
      notes: input.notes,
    })
    .eq("id", orderId)

  if (orderError) throw orderError

  if (itemResult.data) {
    const { error } = await supabase
      .from("order_items")
      .update({ description: input.product_name })
      .eq("id", itemResult.data.id)
    if (error) throw error
  } else {
    // Shouldn't normally happen (createOrder always makes one), but keeps
    // this function correct even against a hand-edited or legacy row.
    const { error } = await supabase.from("order_items").insert({
      order_id: orderId,
      description: input.product_name,
      specifications: {},
      quantity: 1,
      unit_price: 0,
    })
    if (error) throw error
  }

  // Files are immutable once uploaded - only insert-new / delete-removed.
  const submittedFileIds = new Set(input.files.filter((file) => file.id).map((file) => file.id as string))
  const removedFiles = existingFiles.filter((file) => !submittedFileIds.has(file.id))
  const newFiles = input.files.filter((file) => !file.id)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (newFiles.length > 0) {
    const { error } = await supabase.from("order_files").insert(
      newFiles.map((file) => ({
        order_id: orderId,
        file_name: file.file_name,
        file_url: file.file_url,
        file_type: file.file_type,
        file_size: file.file_size,
        uploaded_by: user?.id ?? null,
      }))
    )
    if (error) throw error
  }

  if (removedFiles.length > 0) {
    const { error } = await supabase
      .from("order_files")
      .delete()
      .in("id", removedFiles.map((file) => file.id))
    if (error) throw error
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(removedFiles.map((file) => file.file_url))
  }

  await logActivity(supabase, { entity_id: orderId, action: "updated", description: "Order updated." })
  if (newFiles.length > 0) {
    await logActivity(supabase, {
      entity_id: orderId,
      action: "file_uploaded",
      description: `Uploaded ${newFiles.length} file(s).`,
    })
  }
  if (removedFiles.length > 0) {
    await logActivity(supabase, {
      entity_id: orderId,
      action: "file_removed",
      description: `Removed ${removedFiles.length} file(s).`,
    })
  }
}
