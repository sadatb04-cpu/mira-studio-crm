import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { SectionCard } from "@/components/shared/section-card"
import { createClient } from "@/lib/supabase/server"
import { getJewelryItems, getJewelryStats } from "@/lib/supabase/jewelry"
import { getSupplierOptions } from "@/lib/supabase/inventory-shared"
import { JewelryFilters } from "@/components/jewelry/jewelry-filters"
import { JewelryTable } from "@/components/jewelry/jewelry-table"
import { JewelryStatCards } from "@/components/jewelry/jewelry-stat-cards"
import { JewelryActionButtons } from "@/components/jewelry/jewelry-action-buttons"
import { JEWELRY_STATUSES } from "@/types/jewelry"
import type { JewelryStatus } from "@/types/jewelry"

interface JewelryPageProps {
  searchParams: Promise<{ q?: string; category?: string; status?: string; stockLevel?: string }>
}

const STOCK_LEVELS = ["in_stock", "low_stock", "out_of_stock"] as const

export default async function JewelryPage({ searchParams }: JewelryPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const validStatus = JEWELRY_STATUSES.includes(params.status as JewelryStatus) ? (params.status as JewelryStatus) : undefined
  const validStockLevel = STOCK_LEVELS.includes(params.stockLevel as (typeof STOCK_LEVELS)[number])
    ? (params.stockLevel as (typeof STOCK_LEVELS)[number])
    : undefined

  const [items, stats, suppliers] = await Promise.all([
    getJewelryItems(supabase, { search: params.q, category: params.category, status: validStatus, stockLevel: validStockLevel }),
    getJewelryStats(supabase),
    getSupplierOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link href="/inventory" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" />
        Back to Inventory
      </Link>

      <PageHeader
        title="Jewelry"
        description="Finished pieces - SKU, metal, stone detail, and stock levels."
        actions={<JewelryActionButtons suppliers={suppliers} />}
      />

      <JewelryStatCards stats={stats} />

      {stats.totalProducts === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Sparkles}
            title="No jewelry items yet"
            description="Add your first piece manually, or bulk import from Excel, CSV, PDF, or Google Sheets."
          />
        </SectionCard>
      ) : (
        <>
          <JewelryFilters />
          <JewelryTable items={items} />
        </>
      )}
    </div>
  )
}
