import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { createClient } from "@/lib/supabase/server"
import { getOrderById } from "@/lib/supabase/orders"
import { getProductionJobsForOrder } from "@/lib/supabase/production"
import { ReleaseToProductionButton } from "@/app/(app)/orders/[id]/release-to-production-button"
import { ORDER_STATUS_LABELS } from "@/types/order"
import type { OrderItemDetail, OrderStatus } from "@/types/order"

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "info",
  in_production: "warning",
  ready_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
}

function formatSpecSummary(specifications: OrderItemDetail["specifications"]) {
  const pieceParts = [specifications.metal_purity, specifications.metal, specifications.jewelry_type].filter(
    Boolean
  )
  const stoneParts = [specifications.stone_shape, specifications.stone_type, specifications.stone_size].filter(
    Boolean
  )

  const extras: string[] = []
  if (specifications.ring_size) extras.push(`Ring size ${specifications.ring_size}`)
  if (specifications.engraving) extras.push(`Engraving: "${specifications.engraving}"`)

  const summary = [
    pieceParts.length ? pieceParts.join(" ") : null,
    stoneParts.length ? stoneParts.join(" ") : null,
    ...extras,
  ].filter(Boolean)

  return summary.length ? summary.join(" · ") : null
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const order = await getOrderById(supabase, id)

  if (!order) {
    notFound()
  }

  const orderId = order.id
  const productionJobs = await getProductionJobsForOrder(supabase, orderId)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={order.order_number}
        description={`Placed ${formatDate(order.order_date)}`}
        actions={<StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Customer">
          {order.customer ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={order.customer.full_name} />
              <Field label="Company" value={order.customer.company_name ?? "—"} />
              <Field label="Email" value={order.customer.email ?? "—"} />
              <Field label="Phone" value={order.customer.phone ?? "—"} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No customer on file.</p>
          )}
        </SectionCard>

        <SectionCard title="Order Information">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Due Date" value={order.due_date ? formatDate(order.due_date) : "Not set"} />
            <Field label="Notes" value={order.notes ?? "—"} className="sm:col-span-2" />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Order Items">
        {order.order_items.length === 0 ? (
          <EmptyState title="No items on this order" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item) => {
                  const specSummary = formatSpecSummary(item.specifications)
                  const lineTotal = item.total_price ?? item.quantity * item.unit_price

                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">{item.description}</div>
                        {specSummary && <div className="text-xs text-muted-foreground">{specSummary}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {formatCurrency(item.unit_price, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatCurrency(lineTotal, order.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Pricing Summary">
          <dl className="flex flex-col gap-2 text-sm">
            <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
            <SummaryRow label="Tax" value={formatCurrency(order.tax, order.currency)} />
            <SummaryRow label="Shipping" value={formatCurrency(order.shipping_cost, order.currency)} />
            <SummaryRow label="Total" value={formatCurrency(order.total, order.currency)} emphasize />
          </dl>
        </SectionCard>

        <SectionCard title="Production">
          {productionJobs.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {productionJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/production/${job.id}`} className="text-sm text-primary hover:underline">
                    {job.job_number}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ReleaseToProductionButton orderId={orderId} />
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function SummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        emphasize && "border-t border-border pt-2 font-semibold text-foreground"
      )}
    >
      <span className={emphasize ? undefined : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
