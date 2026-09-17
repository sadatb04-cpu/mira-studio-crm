import { Clock, UserPlus, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { LeadFilters } from "@/components/sales/lead-filters"
import { LeadsWorkspace } from "@/components/sales/leads-workspace"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { LEADS_PAGE_SIZE, getLeadStats, getLeads } from "@/lib/supabase/leads"
import { LEAD_SOURCES, LEAD_STATUSES } from "@/types/lead"
import type { LeadSource, LeadStatus } from "@/types/lead"

interface SalesPageProps {
  searchParams: Promise<{ q?: string; status?: string; source?: string }>
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requirePageView("sales")

  const { q, status: statusParam, source: sourceParam } = await searchParams
  const supabase = await createClient()

  const status = LEAD_STATUSES.includes(statusParam as LeadStatus) ? (statusParam as LeadStatus) : undefined
  const source = LEAD_SOURCES.includes(sourceParam as LeadSource) ? (sourceParam as LeadSource) : undefined
  const filters = { search: q, status, source }

  const [stats, { leads, hasMore }] = await Promise.all([
    getLeadStats(supabase),
    getLeads(supabase, { ...filters, limit: LEADS_PAGE_SIZE }),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Sales" description="Capture and manage leads before they become customers." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} />
        <StatCard label="New" value={stats.newLeads} icon={UserPlus} />
        <StatCard label="Added This Week" value={stats.newThisWeek} icon={Clock} />
      </div>

      <LeadFilters />

      {/* Keyed on the active filters so switching them resets this
          component's client-owned row state, matching the identical
          <OrdersTable key={...}> trick used on the Orders list page. */}
      <LeadsWorkspace key={`${q ?? ""}-${status ?? ""}-${source ?? ""}`} initialLeads={leads} initialHasMore={hasMore} filters={filters} />
    </div>
  )
}
