import Link from "next/link"
import { Factory } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { FinanceManufacturerSummary } from "@/types/finance"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface ManufacturerCardProps {
  manufacturer: FinanceManufacturerSummary
}

export function ManufacturerCard({ manufacturer }: ManufacturerCardProps) {
  return (
    <Link href={`/finance/manufacturing/${manufacturer.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Factory className="size-5 text-primary" />
            <span className="font-medium text-foreground">{manufacturer.name}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>{manufacturer.invoiceCount === 1 ? "1 Invoice" : `${manufacturer.invoiceCount} Invoices`}</span>
            {manufacturer.totalManufacturingSpend > 0 && <span>{formatCurrency(manufacturer.totalManufacturingSpend)} total</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
