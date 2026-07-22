"use client"

import { Gem } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductionStatusBadge } from "@/components/production/production-status-badge"
import { PRODUCTION_PRIORITY_LABELS } from "@/types/production"
import type { ProductionJobListItem } from "@/types/production"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface ProductionTableProps {
  jobs: ProductionJobListItem[]
}

export function ProductionTable({ jobs }: ProductionTableProps) {
  const router = useRouter()

  if (jobs.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={Gem}
          title="No production jobs found"
          description="Try adjusting your search or filters, or release an order to production."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Job #</th>
            <th className="px-4 py-2">Order</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">Assigned</th>
            <th className="px-4 py-2">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => router.push(`/production/${job.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  href={`/production/${job.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {job.job_number}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{job.order_item?.order?.order_number ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {job.order_item?.order?.customer?.full_name ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{job.order_item?.description ?? "—"}</td>
              <td className="px-4 py-2.5">
                <ProductionStatusBadge status={job.status} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{PRODUCTION_PRIORITY_LABELS[job.priority]}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{job.assigned_employee?.full_name ?? "Unassigned"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(job.due_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
