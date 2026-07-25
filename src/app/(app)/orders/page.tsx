import { Plus, ShoppingBag } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { createClient } from "@/lib/supabase/server"
import { getOrders, getOrderStatusCounts } from "@/lib/supabase/orders"
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

  const [orders, statusCounts] = await Promise.all([
    getOrders(supabase, { search: q, status: validStatus }),
    getOrderStatusCounts(supabase),
  ])

  const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Orders"
        description="Manage orders, bespoke commissions, and transactions."
        actions={
          <PermissionGate module="orders" action="create">
            <Button asChild size="sm">
              <Link href="/orders/new">
                <Plus className="size-3.5" data-icon="inline-start" />
                New Order
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingBag} />
        <StatCard label="In Production" value={statusCounts.in_production} />
        <StatCard label="Ready for Delivery" value={statusCounts.ready_for_delivery} />
        <StatCard label="Completed" value={statusCounts.completed} />
      </div>

      <OrdersFilters />

      <OrdersTable orders={orders} />
    </div>
  )
}
