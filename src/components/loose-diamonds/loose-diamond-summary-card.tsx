import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import type { LooseDiamondDetail } from "@/types/loose-diamond"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface LooseDiamondSummaryCardProps {
  diamond: LooseDiamondDetail
}

export function LooseDiamondSummaryCard({ diamond }: LooseDiamondSummaryCardProps) {
  return (
    <SectionCard title="Grading Detail">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Lab" value={diamond.lab} />
        <Field label="Shape" value={diamond.shape} />
        <Field label="Carat" value={diamond.carat.toFixed(2)} />
        <Field label="Color" value={diamond.color} />
        <Field label="Clarity" value={diamond.clarity} />
        <Field label="Cut" value={diamond.cut} />
        <Field label="Polish" value={diamond.polish} />
        <Field label="Symmetry" value={diamond.symmetry} />
        <Field label="Fluorescence" value={diamond.fluorescence} />
        <Field label="Growth Type" value={diamond.growth_type} />
        <Field label="Country of Origin" value={diamond.country_of_origin} />
        <Field label="Cost (USD)" value={formatCurrency(diamond.cost_usd)} />
        <Field label="Selling Price" value={formatCurrency(diamond.selling_price)} />
        <Field label="Supplier" value={diamond.supplierName} />
        <Field label="Date Added" value={format(new Date(diamond.date_added), "MMM d, yyyy")} />
      </dl>
      {diamond.notes && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <p className="mt-1 text-sm text-foreground">{diamond.notes}</p>
        </div>
      )}
    </SectionCard>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}
