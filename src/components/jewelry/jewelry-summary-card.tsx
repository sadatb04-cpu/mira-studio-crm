import { SectionCard } from "@/components/shared/section-card"
import type { JewelryDetail } from "@/types/jewelry"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface JewelrySummaryCardProps {
  item: JewelryDetail
}

export function JewelrySummaryCard({ item }: JewelrySummaryCardProps) {
  return (
    <SectionCard title="Product Detail">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="SKU" value={item.sku} />
        <Field label="Category" value={item.category} />
        <Field label="Metal" value={item.metal} />
        <Field label="Metal Purity" value={item.metal_purity} />
        <Field label="Diamond Type" value={item.diamond_type} />
        <Field label="Diamond Weight" value={item.diamond_weight !== null ? `${item.diamond_weight} ct` : null} />
        <Field label="Gross Weight" value={item.gross_weight !== null ? `${item.gross_weight} g` : null} />
        <Field label="Net Weight" value={item.net_weight !== null ? `${item.net_weight} g` : null} />
        <Field label="Cost" value={formatCurrency(item.cost)} />
        <Field label="Selling Price" value={formatCurrency(item.selling_price)} />
        <Field label="Location" value={item.location} />
        <Field label="Supplier" value={item.supplierName} />
      </dl>
      {item.notes && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <p className="mt-1 text-sm text-foreground">{item.notes}</p>
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
