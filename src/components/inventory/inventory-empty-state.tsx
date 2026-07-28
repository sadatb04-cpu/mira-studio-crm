import { Gem } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { InventoryActionButtons } from "@/components/inventory/inventory-action-buttons"
import type { SupplierOption } from "@/types/inventory"

interface InventoryEmptyStateProps {
  suppliers: SupplierOption[]
}

export function InventoryEmptyState({ suppliers }: InventoryEmptyStateProps) {
  return (
    <SectionCard>
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-24 rounded-full bg-primary/25 blur-2xl" aria-hidden="true" />
          <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-brand-secondary/10 shadow-lg shadow-primary/10">
            <Gem className="size-9 text-primary" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground">Your inventory is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add items one at a time, or import your existing stock from a spreadsheet, PDF, or Google Sheet.
          </p>
        </div>

        <InventoryActionButtons suppliers={suppliers} />
      </div>
    </SectionCard>
  )
}
