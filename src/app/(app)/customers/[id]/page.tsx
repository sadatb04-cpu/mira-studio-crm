import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge"
import { CustomerSummaryCard } from "@/components/customers/customer-summary-card"
import { CustomerTimeline } from "@/components/customers/customer-timeline"
import { createClient } from "@/lib/supabase/server"
import { getCustomer, getCustomerOrders, getCustomerStats, getCustomerTimeline } from "@/lib/supabase/customers"
import { ORDER_STATUS_LABELS } from "@/types/order"
import type { OrderStatus } from "@/types/order"

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "info",
  in_production: "warning",
  ready_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const customer = await getCustomer(supabase, id)

  if (!customer) {
    notFound()
  }

  const [stats, orders, timeline] = await Promise.all([
    getCustomerStats(supabase, id),
    getCustomerOrders(supabase, id),
    getCustomerTimeline(supabase, id),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={customer.full_name}
        description={customer.company_name ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <CustomerStatusBadge isActive={customer.is_active} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CustomerSummaryCard customer={customer} />

        <SectionCard title="Notes">
          <p className="text-sm text-foreground">{customer.notes ?? "No notes on file."}</p>
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Orders" value={stats.totalOrders} />
        <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
        <StatCard label="Average Order Value" value={formatCurrency(stats.averageOrderValue)} />
        <StatCard label="First Purchase" value={formatDate(stats.firstPurchaseDate)} />
        <StatCard label="Latest Purchase" value={formatDate(stats.latestPurchaseDate)} />
      </div>

      <SectionCard title="Recent Orders">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders placed by this customer will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2">Order Number</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link href={`/orders/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(order.order_date)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                      {formatCurrency(order.total, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Timeline">
        <CustomerTimeline events={timeline} />
      </SectionCard>
    </div>
  )
}
