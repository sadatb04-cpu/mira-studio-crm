import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { JewelryStatusBadge } from "@/components/jewelry/jewelry-status-badge"
import { JewelryStockLevelBadge } from "@/components/jewelry/jewelry-stock-level-badge"
import { JewelrySummaryCard } from "@/components/jewelry/jewelry-summary-card"
import { JewelryFormDrawer } from "@/components/jewelry/jewelry-form-drawer"
import { JewelryAdjustStockDialog } from "@/components/jewelry/jewelry-adjust-stock-dialog"
import { StockMovementTable } from "@/components/inventory-shared/stock-movement-table"
import { createClient } from "@/lib/supabase/server"
import { getJewelryItem } from "@/lib/supabase/jewelry"
import { getStockMovements, getSupplierOptions } from "@/lib/supabase/inventory-shared"

interface JewelryItemPageProps {
  params: Promise<{ id: string }>
}

export default async function JewelryItemPage({ params }: JewelryItemPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const item = await getJewelryItem(supabase, id)
  if (!item) {
    notFound()
  }

  const [movementsPage, suppliers] = await Promise.all([
    getStockMovements(supabase, { jewelryItemId: id }),
    getSupplierOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link href="/inventory/jewelry" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" />
        Back to Jewelry
      </Link>

      <PageHeader
        title={item.product_name}
        description={item.sku}
        actions={
          <div className="flex items-center gap-2">
            <JewelryStatusBadge status={item.status} />
            <JewelryStockLevelBadge quantity={item.quantity} reorderLevel={item.reorder_level} />
            <JewelryAdjustStockDialog jewelryItemId={item.id} />
            <JewelryFormDrawer suppliers={suppliers} item={item} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Quantity on Hand</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{item.quantity}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Reorder Level</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{item.reorder_level}</p>
        </div>
      </div>

      <JewelrySummaryCard item={item} />

      <SectionCard title="Stock Movement History">
        <StockMovementTable movements={movementsPage.movements} hasMore={movementsPage.hasMore} jewelryItemId={id} />
      </SectionCard>
    </div>
  )
}
