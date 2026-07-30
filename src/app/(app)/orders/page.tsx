import { ShoppingBag } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { OrderActionButtons } from "@/components/orders/order-action-buttons"
import { createClient } from "@/lib/supabase/server"
import { getOrders, getOrderStatusCounts, ORDERS_PAGE_SIZE } from "@/lib/supabase/orders"
import { OrdersFilters } from "@/app/(app)/orders/orders-filters"
import { OrdersTable } from "@/app/(app)/orders/orders-table"
import { ORDER_STATUSES } from "@/types/order"
import type { OrderStatus } from "@/types/order"

interface OrdersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { q, status } = await searchParams
  const supabase = await createClient()

  const validStatus = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined

  // Search results come back in full (getOrders' search path can't be
  // range-paginated), so pagination only applies to the unfiltered/status-
  // filtered view - fetching one extra row is how hasMore is detected
  // without a separate count query.
  const [rawOrders, statusCounts] = await Promise.all([
    getOrders(supabase, q ? { search: q, status: validStatus } : { status: validStatus, limit: ORDERS_PAGE_SIZE, offset: 0 }),
    getOrderStatusCounts(supabase),
  ])

  const hasMore = !q && rawOrders.length > ORDERS_PAGE_SIZE
  const orders = hasMore ? rawOrders.slice(0, ORDERS_PAGE_SIZE) : rawOrders

  const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Orders"
        description="Manage orders, bespoke commissions, and transactions."
        actions={<OrderActionButtons />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingBag} />
        <StatCard label="In Production" value={statusCounts.in_production} />
        <StatCard label="Ready for Delivery" value={statusCounts.ready_for_delivery} />
        <StatCard label="Completed" value={statusCounts.completed} />
      </div>

      <OrdersFilters />

      {/* key forces a remount (resetting the table's own accumulated
          "Load More" state) whenever the filters change - otherwise the
          client component would keep showing the previous filter's
          already-loaded rows on top of the newly-filtered first page. */}
      <OrdersTable key={`${validStatus ?? "all"}-${q ?? ""}`} orders={orders} hasMore={hasMore} status={validStatus} />
    </div>
  )
}
