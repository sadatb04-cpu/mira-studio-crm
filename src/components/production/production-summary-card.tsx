import Link from "next/link"
import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import { PRODUCTION_PRIORITY_LABELS } from "@/types/production"
import type { ProductionJobDetail } from "@/types/production"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "Not set"
}

interface ProductionSummaryCardProps {
  job: ProductionJobDetail
}

export function ProductionSummaryCard({ job }: ProductionSummaryCardProps) {
  return (
    <SectionCard title="Job Summary">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Job Number" value={job.job_number} />
        <Field
          label="Related Order"
          value={
            <Link href={`/orders/${job.order_item.order.id}`} className="text-primary hover:underline">
              {job.order_item.order.order_number}
            </Link>
          }
        />
        <Field label="Customer" value={job.order_item.order.customer?.full_name ?? "—"} />
        <Field label="Priority" value={PRODUCTION_PRIORITY_LABELS[job.priority]} />
        <Field label="Due Date" value={formatDate(job.due_date)} />
        <Field label="Notes" value={job.notes ?? "—"} className="sm:col-span-2" />
      </dl>
    </SectionCard>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
