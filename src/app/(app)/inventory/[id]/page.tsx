import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { InventoryStatusBadge } from "@/components/inventory/inventory-status-badge"
import { InventorySummaryCard } from "@/components/inventory/inventory-summary-card"
import { InventoryTransactionTable } from "@/components/inventory/inventory-transaction-table"
import { InventoryAdjustmentDialog } from "@/components/inventory/inventory-adjustment-dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getInventoryItem, getInventoryTransactions } from "@/lib/supabase/inventory"

interface InventoryItemPageProps {
  params: Promise<{ id: string }>
}

export default async function InventoryItemPage({ params }: InventoryItemPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const item = await getInventoryItem(supabase, id)

  if (!item) {
    notFound()
  }

  const transactions = await getInventoryTransactions(supabase, id)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={item.name}
        description={item.sku}
        actions={
          <div className="flex items-center gap-2">
            <InventoryStatusBadge quantityOnHand={item.quantity_on_hand} minimumStock={item.minimum_stock} />
            <InventoryAdjustmentDialog
              mode="adjust"
              item={{ id: item.id, name: item.name, unit: item.unit }}
              trigger={
                <Button type="button" size="sm" variant="outline">
                  Adjust Stock
                </Button>
              }
            />
          </div>
        }
      />

      <InventorySummaryCard item={item} />

      <SectionCard title="Transaction History">
        <InventoryTransactionTable transactions={transactions} />
      </SectionCard>
    </div>
  )
}
