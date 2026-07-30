import { SectionCard } from "@/components/shared/section-card"
import { RecentActivity } from "@/components/reports/recent-activity"
import { createClient } from "@/lib/supabase/server"
import { getRecentActivity } from "@/lib/supabase/reports"

interface RecentActivitySectionProps {
  limit?: number
}

// Rendered inside its own <Suspense> boundary on the Dashboard and Reports
// pages - fetches independently of the main KPI/chart/table Promise.all so
// a slow activity-label lookup never holds up everything above it.
export async function RecentActivitySection({ limit }: RecentActivitySectionProps) {
  const supabase = await createClient()
  const items = await getRecentActivity(supabase, limit)

  return (
    <SectionCard title="Recent Activity">
      <RecentActivity items={items} />
    </SectionCard>
  )
}
