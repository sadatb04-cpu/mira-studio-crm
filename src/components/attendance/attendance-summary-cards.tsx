import { AlertTriangle, Briefcase, Coffee, UserX, CheckCircle2 } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { AttendanceDashboardSummary } from "@/types/attendance"

interface AttendanceSummaryCardsProps {
  summary: AttendanceDashboardSummary
}

export function AttendanceSummaryCards({ summary }: AttendanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <StatCard label="Working" value={summary.working} icon={Briefcase} />
      <StatCard label="On Break" value={summary.onBreak} icon={Coffee} />
      <StatCard label="Finished" value={summary.finished} icon={CheckCircle2} />
      <StatCard label="Absent" value={summary.absent} icon={UserX} />
      <StatCard label="Auto Closed" value={summary.autoClosed} icon={AlertTriangle} />
    </div>
  )
}
