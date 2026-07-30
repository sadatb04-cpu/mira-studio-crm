import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { AttendanceTimerWidget } from "@/components/attendance/attendance-timer-widget"
import { SessionHistoryList } from "@/components/attendance/session-history-list"
import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary-cards"
import { AttendanceFilters } from "@/components/attendance/attendance-filters"
import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table"
import { AttendanceExportButton } from "@/components/attendance/attendance-export-button"
import { DailyActivityTracker } from "@/components/attendance/daily-activity-tracker"
import { ManagerActivityOverview } from "@/components/attendance/manager-activity-overview"
import { ActivityLogFilters } from "@/components/attendance/activity-log-filters"
import { ActivityLogTable } from "@/components/attendance/activity-log-table"
import { ActivityInsightsPanel } from "@/components/attendance/activity-insights-panel"
import { ActivityExportButton } from "@/components/attendance/activity-export-button"
import { createClient, getCachedUser } from "@/lib/supabase/server"
import { getCachedProfile } from "@/lib/supabase/profile"
import {
  ensureLinkedEmployeeId,
  getAttendanceDashboardSummary,
  getAttendanceEmployeeOptions,
  getAttendanceHistory,
  getTodaySessions,
  reconcileAttendance,
} from "@/lib/supabase/attendance"
import { getActivityLog, getManagerActivityOverview, getTodayActivities } from "@/lib/supabase/daily-activities"
import { resolveDateRange } from "@/lib/supabase/reports"
import { DATE_RANGE_PRESETS } from "@/types/report"
import type { DateRangePreset } from "@/types/report"
import { ATTENDANCE_STATUSES } from "@/types/attendance"
import type { AttendanceStatus } from "@/types/attendance"
import { ACTIVITY_STATUSES } from "@/types/daily-activity"
import type { ActivityStatus } from "@/types/daily-activity"

const MANAGER_ROLES = ["admin", "operations_manager", "production_manager"]

interface AttendancePageProps {
  searchParams: Promise<{
    employeeId?: string
    status?: string
    preset?: string
    from?: string
    to?: string
    activityEmployeeId?: string
    activityStatus?: string
    activitySearch?: string
    activityPreset?: string
    activityFrom?: string
    activityTo?: string
  }>
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const {
    employeeId,
    status,
    preset: presetParam,
    from: fromParam,
    to: toParam,
    activityEmployeeId,
    activityStatus,
    activitySearch,
    activityPreset: activityPresetParam,
    activityFrom: activityFromParam,
    activityTo: activityToParam,
  } = await searchParams

  const supabase = await createClient()
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getCachedProfile(user.id)
  const isManager = MANAGER_ROLES.includes(profile.role)

  // Reconciliation-on-read: guarantees auto-absent/auto-close corrections
  // are applied by the time this page renders even if pg_cron hasn't run
  // yet (or is unavailable on this project) - see migration 0009.
  await reconcileAttendance(supabase)

  // Every active account should have a linked employee record by now (auto-
  // created on Add User, or backfilled by migration 0023) - this is the
  // self-healing fallback for any gap, so "You haven't been added as an
  // employee yet." should never actually render for a valid session. It's
  // only ever caught here so an unexpected DB error still degrades to that
  // message instead of a hard 500.
  let linkedEmployeeId: string | null = null
  try {
    linkedEmployeeId = await ensureLinkedEmployeeId(supabase, user.id)
  } catch {
    linkedEmployeeId = null
  }
  const hasEmployeeRecord = linkedEmployeeId !== null
  const todaySessions = linkedEmployeeId ? await getTodaySessions(supabase, linkedEmployeeId) : []
  // "After checking in" - at least one session exists today, regardless of
  // whether it's still active or already finished.
  const hasCheckedInToday = todaySessions.length > 0
  const todayActivities =
    linkedEmployeeId && hasCheckedInToday ? await getTodayActivities(supabase, linkedEmployeeId) : []

  let managerSection: ReactNode = null

  if (isManager) {
    const validStatus = ATTENDANCE_STATUSES.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : undefined
    const preset = (DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset) ? presetParam : "today") as DateRangePreset
    const range = resolveDateRange(preset, fromParam, toParam)

    const filters = { employeeId: employeeId || undefined, status: validStatus, from: range.from, to: range.to }

    const validActivityStatus = ACTIVITY_STATUSES.includes(activityStatus as ActivityStatus)
      ? (activityStatus as ActivityStatus)
      : undefined
    const activityPreset = (
      DATE_RANGE_PRESETS.includes(activityPresetParam as DateRangePreset) ? activityPresetParam : "7d"
    ) as DateRangePreset
    const activityRange = resolveDateRange(activityPreset, activityFromParam, activityToParam)

    const activityFilters = {
      employeeId: activityEmployeeId || undefined,
      status: validActivityStatus,
      search: activitySearch || undefined,
      from: activityRange.from,
      to: activityRange.to,
    }

    const [summary, employees, history, activityOverview, activityLog] = await Promise.all([
      getAttendanceDashboardSummary(supabase),
      getAttendanceEmployeeOptions(supabase),
      getAttendanceHistory(supabase, filters),
      getManagerActivityOverview(supabase),
      getActivityLog(supabase, activityFilters),
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

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Employee Activity Overview</h2>
          <ManagerActivityOverview entries={activityOverview} />
        </div>

        <SectionCard
          title="Activity Log"
          description="Search and review every employee's logged activities."
          actions={<ActivityExportButton filters={activityFilters} />}
        >
          <div className="flex flex-col gap-4">
            <ActivityLogFilters employees={employees} />
            <ActivityInsightsPanel activities={activityLog} />
            <ActivityLogTable activities={activityLog} />
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
        <>
          <AttendanceTimerWidget sessions={todaySessions} />
          <SessionHistoryList sessions={todaySessions} />
          {hasCheckedInToday && <DailyActivityTracker activities={todayActivities} sessions={todaySessions} />}
        </>
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
