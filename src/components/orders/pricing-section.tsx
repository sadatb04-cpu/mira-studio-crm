import { Plus } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { QuotationDialog } from "@/components/orders/quotation-dialog"
import { QuotationCard } from "@/components/orders/quotation-card"
import type { Quotation } from "@/types/quotation"

interface PricingSectionProps {
  orderId: string
  quotations: Quotation[]
}

export function PricingSection({ orderId, quotations }: PricingSectionProps) {
  if (quotations.length === 0) {
    return (
      <SectionCard title="Pricing">
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No quotations have been created.</p>
          <QuotationDialog
            orderId={orderId}
            mode="create"
            trigger={
              <Button type="button" size="lg">
                <Plus className="size-4" data-icon="inline-start" />
                Give Pricing
              </Button>
            }
          />
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Pricing"
      actions={
        <QuotationDialog
          orderId={orderId}
          mode="create"
          trigger={
            <Button type="button" size="sm">
              <Plus className="size-3.5" data-icon="inline-start" />
              Add Another Pricing
            </Button>
          }
        />
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {quotations.map((quotation) => (
          <QuotationCard key={quotation.id} orderId={orderId} quotation={quotation} />
        ))}
      </div>
    </SectionCard>
  )
}
