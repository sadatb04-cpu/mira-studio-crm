import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { ProductionStatusBadge } from "@/components/production/production-status-badge"
import { ProductionSummaryCard } from "@/components/production/production-summary-card"
import { ProductionAssignmentCard } from "@/components/production/production-assignment-card"
import { ProductionStatusStepper } from "@/components/production/production-status-stepper"
import { ProductionTimeline } from "@/components/production/production-timeline"
import { InventoryAdjustmentDialog } from "@/components/inventory/inventory-adjustment-dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getEmployees, getProductionJob, getProductionTimeline } from "@/lib/supabase/production"
import { getInventoryItemOptions } from "@/lib/supabase/inventory"

interface ProductionJobPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ released?: string }>
}

export default async function ProductionJobPage({ params, searchParams }: ProductionJobPageProps) {
  const { id } = await params
  const { released } = await searchParams
  const supabase = await createClient()

  const job = await getProductionJob(supabase, id)

  if (!job) {
    notFound()
  }

  const [employees, timeline, inventoryItems] = await Promise.all([
    getEmployees(supabase),
    getProductionTimeline(supabase, id),
    getInventoryItemOptions(supabase),
  ])

  const specs = job.order_item.specifications
  const stoneSummary = [specs.stone_type, specs.stone_shape, specs.stone_size].filter(Boolean).join(" · ") || "—"

  // "Allow recording inventory consumption" while production is actively
  // underway - not before it's started (queued) or after it's finished
  // (completed/cancelled).
  const canConsumeInventory = job.status === "in_progress" || job.status === "quality_check"

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {released === "1" && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Order released to production.
        </p>
      )}

      <PageHeader
        title={job.job_number}
        description="Production job"
        actions={<ProductionStatusBadge status={job.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductionSummaryCard job={job} />
        <ProductionAssignmentCard
          jobId={job.id}
          employees={employees}
          assignedEmployeeId={job.assigned_employee?.id ?? null}
        />
      </div>

      <ProductionStatusStepper job={job} />

      <SectionCard
        title="Order Item"
        actions={
          canConsumeInventory && (
            <InventoryAdjustmentDialog
              mode="consume"
              items={inventoryItems}
              productionJobId={job.id}
              trigger={
                <Button type="button" size="sm" variant="outline">
                  Consume Inventory
                </Button>
              }
            />
          )
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Product Name" value={job.order_item.description} />
          <Field label="Jewelry Type" value={specs.jewelry_type ?? "—"} />
          <Field label="Metal" value={specs.metal ?? "—"} />
          <Field label="Purity" value={specs.metal_purity ?? "—"} />
          <Field label="Stone" value={stoneSummary} />
          <Field label="Ring Size" value={specs.ring_size ?? "—"} />
          <Field label="Engraving" value={specs.engraving ?? "—"} />
          <Field label="Quantity" value={String(job.order_item.quantity)} />
        </dl>
      </SectionCard>

      <SectionCard title="Timeline">
        <ProductionTimeline events={timeline} />
      </SectionCard>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
