import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { FileText, Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { createClient } from "@/lib/supabase/server"
import { getOrderById, getOrderTimeline } from "@/lib/supabase/orders"
import { getProductionJobsForOrder } from "@/lib/supabase/production"
import { ReleaseToProductionButton } from "@/app/(app)/orders/[id]/release-to-production-button"
import { formatFileSize } from "@/types/document"
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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
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
  const [productionJobs, timeline] = await Promise.all([
    getProductionJobsForOrder(supabase, orderId),
    getOrderTimeline(supabase, orderId),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={order.order_number}
        description={`Placed ${formatDate(order.order_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />
            <Button asChild size="sm">
              <Link href={`/orders/${orderId}/edit`}>
                <Pencil className="size-3.5" data-icon="inline-start" />
                Edit Order
              </Link>
            </Button>
          </div>
        }
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
            <Field label="Product Name" value={order.productName || "—"} />
            <Field label="Due Date" value={order.due_date ? formatDate(order.due_date) : "Not set"} />
            <Field label="Order Requirements" value={order.notes ?? "—"} className="sm:col-span-2" />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Reference Images & Files">
        {order.files.length === 0 ? (
          <EmptyState title="No reference files on this order" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {order.files.map((file) => (
              <a
                key={file.id}
                href={file.signedUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {file.file_type.startsWith("image/") && file.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.signedUrl} alt={file.file_name} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="size-6 text-muted-foreground" />
                  )}
                </div>
                <p className="truncate text-xs font-medium text-foreground" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
              </a>
            ))}
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

      <SectionCard title="Activity Timeline">
        <OrderTimeline events={timeline} />
      </SectionCard>
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
