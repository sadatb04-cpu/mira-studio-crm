import { SectionCard } from "@/components/shared/section-card"
import { INVENTORY_CATEGORY_LABELS } from "@/types/inventory"
import type { InventoryItemDetail } from "@/types/inventory"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface InventorySummaryCardProps {
  item: InventoryItemDetail
}

export function InventorySummaryCard({ item }: InventorySummaryCardProps) {
  const value = item.quantity_on_hand * item.unit_cost

  return (
    <SectionCard title="General Information">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Item Name" value={item.name} />
        <Field label="SKU" value={item.sku} />
        <Field label="Category" value={INVENTORY_CATEGORY_LABELS[item.category]} />
        <Field label="Unit" value={item.unit} />
        <Field label="Quantity on Hand" value={`${item.quantity_on_hand} ${item.unit}`} />
        <Field label="Reorder Threshold" value={`${item.minimum_stock} ${item.unit}`} />
        <Field label="Unit Cost" value={formatCurrency(item.unit_cost)} />
        <Field label="Inventory Value" value={formatCurrency(value)} />
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
