import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { LooseDiamondStatusBadge } from "@/components/loose-diamonds/loose-diamond-status-badge"
import { LooseDiamondSummaryCard } from "@/components/loose-diamonds/loose-diamond-summary-card"
import { LooseDiamondFormDrawer } from "@/components/loose-diamonds/loose-diamond-form-drawer"
import { LooseDiamondStatusDialog } from "@/components/loose-diamonds/loose-diamond-status-dialog"
import { StockMovementTable } from "@/components/inventory-shared/stock-movement-table"
import { createClient } from "@/lib/supabase/server"
import { getLooseDiamond } from "@/lib/supabase/loose-diamonds"
import { getStockMovements, getSupplierOptions } from "@/lib/supabase/inventory-shared"

interface LooseDiamondPageProps {
  params: Promise<{ id: string }>
}

export default async function LooseDiamondPage({ params }: LooseDiamondPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const diamond = await getLooseDiamond(supabase, id)
  if (!diamond) {
    notFound()
  }

  const [movements, suppliers] = await Promise.all([
    getStockMovements(supabase, { looseDiamondId: id }),
    getSupplierOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link
        href="/inventory/diamonds"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Back to Loose Diamonds
      </Link>

      <PageHeader
        title={diamond.report_number}
        description={diamond.shape ? `${diamond.shape} - ${diamond.carat.toFixed(2)} ct` : `${diamond.carat.toFixed(2)} ct`}
        actions={
          <div className="flex items-center gap-2">
            <LooseDiamondStatusBadge status={diamond.status} />
            <LooseDiamondStatusDialog looseDiamondId={diamond.id} currentStatus={diamond.status} />
            <LooseDiamondFormDrawer suppliers={suppliers} diamond={diamond} />
          </div>
        }
      />

      <LooseDiamondSummaryCard diamond={diamond} />

      <SectionCard title="Stock Movement History">
        <StockMovementTable movements={movements} />
      </SectionCard>
    </div>
  )
}
