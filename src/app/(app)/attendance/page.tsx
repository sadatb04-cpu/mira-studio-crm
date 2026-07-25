import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { AttendanceTimerWidget } from "@/components/attendance/attendance-timer-widget"
import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary-cards"
import { AttendanceFilters } from "@/components/attendance/attendance-filters"
import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table"
import { AttendanceExportButton } from "@/components/attendance/attendance-export-button"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import {
  getAttendanceDashboardSummary,
  getAttendanceEmployeeOptions,
  getAttendanceHistory,
  getLinkedEmployeeId,
  getTodayAttendance,
  reconcileAttendance,
} from "@/lib/supabase/attendance"
import { resolveDateRange } from "@/lib/supabase/reports"
import { DATE_RANGE_PRESETS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ATTENDANCE_STATUSES } from "@/types/attendance"
import type { AttendanceStatus } from "@/types/attendance"

const MANAGER_ROLES = ["admin", "operations_manager", "production_manager"]

interface AttendancePageProps {
  searchParams: Promise<{
    employeeId?: string
    status?: string
    preset?: string
    from?: string
    to?: string
  }>
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const { employeeId, status, preset: presetParam, from: fromParam, to: toParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)
  const isManager = MANAGER_ROLES.includes(profile.role)

  // Reconciliation-on-read: guarantees auto-absent/auto-close corrections
  // are applied by the time this page renders even if pg_cron hasn't run
  // yet (or is unavailable on this project) - see migration 0009.
  await reconcileAttendance(supabase)

  const linkedEmployeeId = await getLinkedEmployeeId(supabase, user.id)
  const hasEmployeeRecord = linkedEmployeeId !== null
  const todayRecord = linkedEmployeeId ? await getTodayAttendance(supabase, linkedEmployeeId) : null

  let managerSection: ReactNode = null

  if (isManager) {
    const validStatus = ATTENDANCE_STATUSES.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : undefined
    const preset = (DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset) ? presetParam : "today") as DateRangePreset
    const range = resolveDateRange(preset, fromParam, toParam)

    const filters = { employeeId: employeeId || undefined, status: validStatus, from: range.from, to: range.to }

    const [summary, employees, history] = await Promise.all([
      getAttendanceDashboardSummary(supabase),
      getAttendanceEmployeeOptions(supabase),
      getAttendanceHistory(supabase, filters),
    ])

    managerSection = (
      <>
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Attendance Dashboard</h2>
          <AttendanceSummaryCards summary={summary} />
        </div>

        <SectionCard
          title="Attendance History"
          description="Live employee status and historical attendance records."
          actions={<AttendanceExportButton filters={filters} />}
        >
          <div className="flex flex-col gap-4">
            <AttendanceFilters employees={employees} />
            <AttendanceHistoryTable records={history} />
          </div>
        </SectionCard>
      </>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Attendance"
        description="Track work sessions, breaks, and daily attendance."
      />

      {hasEmployeeRecord ? (
        <AttendanceTimerWidget record={todayRecord} />
      ) : (
        <SectionCard title="My Attendance">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t been added as an employee yet. Contact an admin to enable attendance tracking for your account.
          </p>
        </SectionCard>
      )}

      {managerSection}
    </div>
  )
}
