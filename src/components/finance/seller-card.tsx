import Link from "next/link"
import { Store } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { FinanceSellerSummary } from "@/types/finance"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface SellerCardProps {
  seller: FinanceSellerSummary
}

export function SellerCard({ seller }: SellerCardProps) {
  return (
    <Link href={`/finance/sellers/${seller.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            <span className="font-medium text-foreground">{seller.name}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>{seller.invoiceCount === 1 ? "1 Invoice" : `${seller.invoiceCount} Invoices`}</span>
            {seller.invoiceCount > 0 && <span>{formatCurrency(seller.totalProfit)} profit</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
