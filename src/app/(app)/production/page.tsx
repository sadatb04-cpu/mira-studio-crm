import { Gem } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { createClient } from "@/lib/supabase/server"
import { getProductionJobs, getProductionStats } from "@/lib/supabase/production"
import { ProductionFilters } from "@/app/(app)/production/production-filters"
import { ProductionTable } from "@/components/production/production-table"
import { PRODUCTION_JOB_STATUSES, PRODUCTION_PRIORITIES } from "@/types/production"
import type { ProductionJobStatus, ProductionPriority } from "@/types/production"

interface ProductionPageProps {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; released?: string }>
}

export default async function ProductionPage({ searchParams }: ProductionPageProps) {
  const { q, status, priority, released } = await searchParams
  const supabase = await createClient()

  const validStatus = PRODUCTION_JOB_STATUSES.includes(status as ProductionJobStatus)
    ? (status as ProductionJobStatus)
    : undefined
  const validPriority = PRODUCTION_PRIORITIES.includes(priority as ProductionPriority)
    ? (priority as ProductionPriority)
    : undefined

  const [jobs, stats] = await Promise.all([
    getProductionJobs(supabase, { search: q, status: validStatus, priority: validPriority }),
    getProductionStats(supabase),
  ])

  const releasedCount = released ? Number.parseInt(released, 10) : 0

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {releasedCount > 0 && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {releasedCount} production jobs created for this order.
        </p>
      )}

      <PageHeader title="Production" description="Track workshop manufacturing, progress, and quality assurance." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Jobs" value={stats.total} icon={Gem} />
        <StatCard label="In Production" value={stats.inProduction} />
        <StatCard label="Quality Check" value={stats.qualityCheck} />
        <StatCard label="Ready" value={stats.ready} />
        <StatCard label="Overdue" value={stats.overdue} />
      </div>

      <ProductionFilters />

      <ProductionTable jobs={jobs} />
    </div>
  )
}
