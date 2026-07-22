import { SectionCard } from "@/components/shared/section-card"
import type { CustomerDetail } from "@/types/customer"

interface CustomerSummaryCardProps {
  customer: CustomerDetail
}

export function CustomerSummaryCard({ customer }: CustomerSummaryCardProps) {
  return (
    <SectionCard title="Customer Information">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name" value={customer.full_name} />
        <Field label="Company" value={customer.company_name ?? "—"} />
        <Field label="Email" value={customer.email ?? "—"} />
        <Field label="Phone" value={customer.phone ?? "—"} />
        <Field label="Country" value={customer.country ?? "—"} />
      </dl>
    </SectionCard>
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
