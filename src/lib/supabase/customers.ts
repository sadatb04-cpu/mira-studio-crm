import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  CustomerDetail,
  CustomerFormInput,
  CustomerListItem,
  CustomerOrderSummary,
  CustomerStats,
  CustomerTimelineEvent,
  CustomersDashboardStats,
} from "@/types/customer"

interface GetCustomersFilters {
  search?: string
  status?: "active" | "inactive"
}

export async function getCustomers(
  supabase: SupabaseClient,
  filters: GetCustomersFilters = {}
): Promise<CustomerListItem[]> {
  let query = supabase
    .from("customers")
    .select("id, full_name, company_name, email, phone, country, is_active, created_at")
    .order("created_at", { ascending: false })

  if (filters.status === "active") {
    query = query.eq("is_active", true)
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false)
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern}`)
  }

  const { data: customers, error } = await query
  if (error) throw error

  const customerIds = (customers ?? []).map((customer) => customer.id)

  const { data: orders, error: ordersError } =
    customerIds.length > 0
      ? await supabase.from("orders").select("customer_id, total, order_date").in("customer_id", customerIds)
      : { data: [] as { customer_id: string; total: number; order_date: string }[], error: null }

  if (ordersError) throw ordersError

  const statsByCustomer = new Map<string, { count: number; total: number; lastDate: string | null }>()

  for (const order of orders ?? []) {
    const existing = statsByCustomer.get(order.customer_id) ?? { count: 0, total: 0, lastDate: null }
    existing.count += 1
    existing.total += order.total
    if (!existing.lastDate || order.order_date > existing.lastDate) {
      existing.lastDate = order.order_date
    }
    statsByCustomer.set(order.customer_id, existing)
  }

  return (customers ?? []).map((customer) => {
    const stats = statsByCustomer.get(customer.id) ?? { count: 0, total: 0, lastDate: null }
    return {
      ...customer,
      totalOrders: stats.count,
      lifetimeSpend: stats.total,
      lastOrderDate: stats.lastDate,
    }
  })
}

export async function getCustomersDashboardStats(supabase: SupabaseClient): Promise<CustomersDashboardStats> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Counts use { count: "exact", head: true } - Postgres returns just the
  // row count, no rows transferred, same pattern already proven in
  // settings.ts's getDatabaseSummary(). Only the revenue sum still needs
  // actual row data (a single narrow column, not full rows) since summing
  // isn't expressible as a count.
  const [totalResult, activeResult, newResult, ordersResult] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("orders").select("total"),
  ])

  if (totalResult.error) throw totalResult.error
  if (activeResult.error) throw activeResult.error
  if (newResult.error) throw newResult.error
  if (ordersResult.error) throw ordersResult.error

  return {
    totalCustomers: totalResult.count ?? 0,
    activeCustomers: activeResult.count ?? 0,
    newCustomers30Days: newResult.count ?? 0,
    lifetimeRevenue: (ordersResult.data ?? []).reduce((sum, order) => sum + order.total, 0),
  }
}

export async function getCustomer(supabase: SupabaseClient, id: string): Promise<CustomerDetail | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, company_name, email, phone, country, notes, is_active, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as CustomerDetail | null
}

export async function getCustomerStats(supabase: SupabaseClient, customerId: string): Promise<CustomerStats> {
  const { data, error } = await supabase.from("orders").select("total, order_date").eq("customer_id", customerId)
  if (error) throw error

  const rows = data ?? []
  const totalOrders = rows.length
  const totalRevenue = rows.reduce((sum, row) => sum + row.total, 0)
  const dates = rows.map((row) => row.order_date).sort()

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    firstPurchaseDate: dates[0] ?? null,
    latestPurchaseDate: dates[dates.length - 1] ?? null,
  }
}

export async function getCustomerOrders(supabase: SupabaseClient, customerId: string): Promise<CustomerOrderSummary[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, order_date, total, currency")
    .eq("customer_id", customerId)
    .order("order_date", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as CustomerOrderSummary[]
}

export async function getCustomerTimeline(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerTimelineEvent[]> {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_id", customerId)

  if (ordersError) throw ordersError

  const orderIds = (orders ?? []).map((order) => order.id as string)

  let jobIds: string[] = []
  if (orderIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from("production_jobs")
      .select("id, order_item:order_items!inner(order_id)")
      .in("order_item.order_id", orderIds)

    if (jobsError) throw jobsError
    jobIds = (jobs ?? []).map((job) => job.id as string)
  }

  const [customerEvents, orderEvents, jobEvents] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, action, description, created_at")
      .eq("entity_type", "customer")
      .eq("entity_id", customerId),
    orderIds.length > 0
      ? supabase
          .from("activity_logs")
          .select("id, action, description, created_at")
          .eq("entity_type", "order")
          .in("entity_id", orderIds)
      : Promise.resolve({ data: [] as CustomerTimelineEvent[], error: null }),
    jobIds.length > 0
      ? supabase
          .from("activity_logs")
          .select("id, action, description, created_at")
          .eq("entity_type", "production_job")
          .in("entity_id", jobIds)
      : Promise.resolve({ data: [] as CustomerTimelineEvent[], error: null }),
  ])

  if (customerEvents.error) throw customerEvents.error
  if (orderEvents.error) throw orderEvents.error
  if (jobEvents.error) throw jobEvents.error

  const allEvents = [
    ...((customerEvents.data ?? []) as CustomerTimelineEvent[]),
    ...((orderEvents.data ?? []) as CustomerTimelineEvent[]),
    ...((jobEvents.data ?? []) as CustomerTimelineEvent[]),
  ]

  return allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_type: "customer" | "order"; entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("activity_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })

  if (error) throw error
}

export async function createCustomer(supabase: SupabaseClient, input: CustomerFormInput): Promise<string> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      address_line1: input.address_line1 || null,
      country: input.country || null,
      notes: input.notes || null,
    })
    .select("id")
    .single()

  if (error) throw error

  const customerId = data.id as string
  await logActivity(supabase, { entity_type: "customer", entity_id: customerId, action: "created", description: "Customer created." })

  return customerId
}

export async function updateCustomer(supabase: SupabaseClient, id: string, input: CustomerFormInput): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      country: input.country || null,
      notes: input.notes || null,
    })
    .eq("id", id)

  if (error) throw error

  await logActivity(supabase, { entity_type: "customer", entity_id: id, action: "updated", description: "Customer details updated." })
}
