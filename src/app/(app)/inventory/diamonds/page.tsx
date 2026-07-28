import Link from "next/link"
import { ArrowLeft, Diamond } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { SectionCard } from "@/components/shared/section-card"
import { createClient } from "@/lib/supabase/server"
import { getLooseDiamonds, getLooseDiamondStats } from "@/lib/supabase/loose-diamonds"
import { getSupplierOptions } from "@/lib/supabase/inventory-shared"
import { LooseDiamondFilters } from "@/components/loose-diamonds/loose-diamond-filters"
import { LooseDiamondTable } from "@/components/loose-diamonds/loose-diamond-table"
import { LooseDiamondStatCards } from "@/components/loose-diamonds/loose-diamond-stat-cards"
import { LooseDiamondActionButtons } from "@/components/loose-diamonds/loose-diamond-action-buttons"
import { LOOSE_DIAMOND_STATUSES } from "@/types/loose-diamond"
import type { LooseDiamondStatus } from "@/types/loose-diamond"

interface LooseDiamondsPageProps {
  searchParams: Promise<{
    q?: string
    shape?: string
    color?: string
    clarity?: string
    growthType?: string
    lab?: string
    status?: string
    minCarat?: string
    maxCarat?: string
  }>
}

export default async function LooseDiamondsPage({ searchParams }: LooseDiamondsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const validStatus = LOOSE_DIAMOND_STATUSES.includes(params.status as LooseDiamondStatus)
    ? (params.status as LooseDiamondStatus)
    : undefined

  const [diamonds, stats, suppliers] = await Promise.all([
    getLooseDiamonds(supabase, {
      search: params.q,
      shape: params.shape,
      color: params.color,
      clarity: params.clarity,
      growthType: params.growthType,
      lab: params.lab,
      status: validStatus,
      minCarat: params.minCarat ? Number(params.minCarat) : undefined,
      maxCarat: params.maxCarat ? Number(params.maxCarat) : undefined,
    }),
    getLooseDiamondStats(supabase),
    getSupplierOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link href="/inventory" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" />
        Back to Inventory
      </Link>

      <PageHeader
        title="Loose Diamonds"
        description="IGI/GIA graded stones - report number, carat, color, clarity, and grading detail."
        actions={<LooseDiamondActionButtons suppliers={suppliers} />}
      />

      <LooseDiamondStatCards stats={stats} />

      {stats.totalStones === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Diamond}
            title="No loose diamonds yet"
            description="Add your first stone manually, or bulk import from Excel, CSV, PDF, or Google Sheets."
          />
        </SectionCard>
      ) : (
        <>
          <LooseDiamondFilters />
          <LooseDiamondTable diamonds={diamonds} />
        </>
      )}
    </div>
  )
}
