import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { FileText, Pencil } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { OrderWorkflowStepper } from "@/components/orders/order-workflow-stepper"
import { OrderWorkflowActions } from "@/components/orders/order-workflow-actions"
import { PricingSection } from "@/components/orders/pricing-section"
import { CopyAddressButton } from "@/components/orders/copy-address-button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { createClient } from "@/lib/supabase/server"
import { getOrderById, getOrderTimeline } from "@/lib/supabase/orders"
import { getQuotationsForOrder } from "@/lib/supabase/quotations"
import { getProductionJobsForOrder } from "@/lib/supabase/production"
import { ReleaseToProductionButton } from "@/app/(app)/orders/[id]/release-to-production-button"
import { formatFileSize } from "@/types/document"
import { ORDER_STATUS_LABELS, formatDeliveryAddress } from "@/types/order"
import type { OrderStatus } from "@/types/order"

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  pricing_ready: "info",
  awaiting_approval: "warning",
  approved: "success",
  confirmed: "info",
  in_production: "warning",
  ready_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
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
  const [productionJobs, timeline, quotations] = await Promise.all([
    getProductionJobsForOrder(supabase, orderId),
    getOrderTimeline(supabase, orderId),
    getQuotationsForOrder(supabase, orderId),
  ])

  const hasAccepted = quotations.some((quotation) => quotation.status === "accepted")
  const addressLines = order.customer ? formatDeliveryAddress(order.customer) : []

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

      <SectionCard title="Workflow">
        <div className="flex flex-col gap-4">
          <OrderWorkflowStepper status={order.status} />
          <OrderWorkflowActions orderId={orderId} status={order.status} quotations={quotations} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Customer">
          {order.customer ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" value={order.customer.full_name} />
                <Field label="Email" value={order.customer.email ?? "—"} />
                <Field label="Phone" value={order.customer.phone ?? "—"} />
              </dl>

              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-medium text-muted-foreground">Delivery Address</dt>
                  <CopyAddressButton addressLines={addressLines} />
                </div>
                {addressLines.length > 0 ? (
                  <dd className="whitespace-pre-line text-sm text-foreground">{addressLines.join("\n")}</dd>
                ) : (
                  <dd className="text-sm text-muted-foreground">No delivery address provided.</dd>
                )}
              </div>
            </div>
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

      <PermissionGate special="view_financial_pricing">
        <PricingSection orderId={orderId} quotations={quotations} />
      </PermissionGate>

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
        ) : hasAccepted ? (
          <ReleaseToProductionButton orderId={orderId} />
        ) : (
          <p className="text-sm text-muted-foreground">Accept a quotation before releasing this order to production.</p>
        )}
      </SectionCard>

      <PermissionGate special="view_activity_logs">
        <SectionCard title="Activity Timeline">
          <OrderTimeline events={timeline} />
        </SectionCard>
      </PermissionGate>
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
