import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  ActivityConflict,
  ActivityLogFilters,
  ActivityStatus,
  CreateActivityInput,
  DailyActivity,
  ManagerActivityOverviewEntry,
  UpdateActivityInput,
} from "@/types/daily-activity"
import type { AttendanceStatus } from "@/types/attendance"

const ACTIVITY_COLUMNS =
  "id, employee_id, attendance_id, activity_title, description, notes, status, started_at, completed_at, duration_minutes, activity_date, created_at, updated_at"

interface RawActivityRow {
  id: string
  employee_id: string
  attendance_id: string | null
  activity_title: string
  description: string | null
  notes: string | null
  status: ActivityStatus
  started_at: string | null
  completed_at: string | null
  duration_minutes: number | null
  activity_date: string
  created_at: string
  updated_at: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toActivity(row: RawActivityRow, employeeName: string): DailyActivity {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName,
    attendanceId: row.attendance_id,
    activityTitle: row.activity_title,
    description: row.description,
    notes: row.notes,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMinutes: row.duration_minutes,
    activityDate: row.activity_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function resolveEmployeeNames(supabase: SupabaseClient, employeeIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(employeeIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase.from("employees").select("id, full_name").in("id", uniqueIds)
  if (error) throw error

  return new Map((data ?? []).map((row) => [row.id as string, row.full_name as string]))
}

// The session an activity created "right now" should attach to - the
// most recent attendance_records row for today, whatever its status.
// Mirrors getActiveSession() in attendance.ts (not exported from there).
async function getLatestAttendanceId(supabase: SupabaseClient, employeeId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("date", todayIso())
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function logActivityEvent(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, matching the non-throwing activity logging pattern
  // used throughout the app.
  await supabase.from("activity_logs").insert({
    entity_type: "daily_activity",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

// ---------------------------------------------------------------------------
// Employee-facing (always scoped to the caller's own employee id)
// ---------------------------------------------------------------------------

export async function getTodayActivities(supabase: SupabaseClient, employeeId: string): Promise<DailyActivity[]> {
  const { data, error } = await supabase
    .from("employee_daily_activities")
    .select(ACTIVITY_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("activity_date", todayIso())
    .order("created_at", { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as RawActivityRow[]
  const names = await resolveEmployeeNames(supabase, [employeeId])
  const employeeName = names.get(employeeId) ?? ""

  return rows.map((row) => toActivity(row, employeeName))
}

export type CreateActivityResult = { id: string; conflict?: undefined } | { id?: undefined; conflict: ActivityConflict }

// No separate "Start" step: creating an activity immediately puts it
// in_progress with started_at = now(). Since only one activity can be
// running at a time (enforced below AND by the DB's partial unique index
// as a race-proof backstop), a create attempt while one is already running
// does NOT create anything - it returns `conflict` describing the current
// activity so the caller can offer "Finish current & start new" or
// "Cancel". Pass `finishCurrent: true` to actually do that: the current
// activity is completed first, then the new one is created and started.
export async function createActivity(
  supabase: SupabaseClient,
  employeeId: string,
  input: CreateActivityInput,
  options: { finishCurrent?: boolean } = {}
): Promise<CreateActivityResult> {
  const { data: current, error: currentError } = await supabase
    .from("employee_daily_activities")
    .select("id, activity_title, started_at")
    .eq("employee_id", employeeId)
    .eq("status", "in_progress")
    .maybeSingle()

  if (currentError) throw currentError

  if (current && !options.finishCurrent) {
    return {
      conflict: {
        activityId: current.id as string,
        activityTitle: current.activity_title as string,
        startedAt: current.started_at as string,
      },
    }
  }

  if (current && options.finishCurrent) {
    await completeActivity(supabase, employeeId, current.id as string)
  }

  const attendanceId = await getLatestAttendanceId(supabase, employeeId)
  const startedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from("employee_daily_activities")
    .insert({
      employee_id: employeeId,
      attendance_id: attendanceId,
      activity_title: input.activityTitle,
      description: input.description || null,
      status: "in_progress",
      started_at: startedAt,
      activity_date: todayIso(),
    })
    .select("id")
    .single()

  if (error) {
    // Race backstop: two rapid submissions could both pass the check above
    // before either insert lands. The partial unique index rejects the
    // second with a unique-violation - surface it as the same conflict
    // shape rather than a raw DB error.
    if (error.code === "23505") {
      const { data: nowRunning } = await supabase
        .from("employee_daily_activities")
        .select("id, activity_title, started_at")
        .eq("employee_id", employeeId)
        .eq("status", "in_progress")
        .maybeSingle()

      if (nowRunning) {
        return {
          conflict: {
            activityId: nowRunning.id as string,
            activityTitle: nowRunning.activity_title as string,
            startedAt: nowRunning.started_at as string,
          },
        }
      }
    }
    throw error
  }

  await logActivityEvent(supabase, { entity_id: data.id as string, action: "created", description: `Started "${input.activityTitle}".` })
  return { id: data.id as string }
}

// Rule: an employee cannot start another activity while one is already In
// Progress - checked here (readable error) and enforced unconditionally by
// the one-in-progress partial unique index (race-proof).
export async function startActivity(supabase: SupabaseClient, employeeId: string, activityId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("employee_daily_activities")
    .select("id, status")
    .eq("employee_id", employeeId)
    .eq("id", activityId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error("Activity not found.")
  if (existing.status !== "pending") throw new Error("Only a pending activity can be started.")

  const { count, error: countError } = await supabase
    .from("employee_daily_activities")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("status", "in_progress")

  if (countError) throw countError
  if ((count ?? 0) > 0) throw new Error("Finish your current activity before starting another one.")

  const { error } = await supabase
    .from("employee_daily_activities")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", activityId)
    .eq("status", "pending")

  if (error) throw error

  await logActivityEvent(supabase, { entity_id: activityId, action: "started", description: "Started activity." })
}

export async function completeActivity(supabase: SupabaseClient, employeeId: string, activityId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("employee_daily_activities")
    .select("id, status, started_at")
    .eq("employee_id", employeeId)
    .eq("id", activityId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error("Activity not found.")
  if (existing.status !== "in_progress") throw new Error("Only an in-progress activity can be completed.")

  const now = new Date()
  const startedAt = existing.started_at ? new Date(existing.started_at) : now
  const durationMinutes = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60000))

  const { error } = await supabase
    .from("employee_daily_activities")
    .update({ status: "completed", completed_at: now.toISOString(), duration_minutes: durationMinutes })
    .eq("id", activityId)
    .eq("status", "in_progress")

  if (error) throw error

  await logActivityEvent(supabase, { entity_id: activityId, action: "completed", description: "Completed activity." })
}

// Rule: employees can only edit Pending activities.
export async function updateOwnActivity(
  supabase: SupabaseClient,
  employeeId: string,
  activityId: string,
  input: UpdateActivityInput
): Promise<void> {
  const { data, error } = await supabase
    .from("employee_daily_activities")
    .update({
      ...(input.activityTitle !== undefined ? { activity_title: input.activityTitle } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    })
    .eq("id", activityId)
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Only a pending activity you own can be edited.")
}

// ---------------------------------------------------------------------------
// Manager-facing (spans every employee)
// ---------------------------------------------------------------------------

export async function getManagerActivityOverview(supabase: SupabaseClient): Promise<ManagerActivityOverviewEntry[]> {
  const today = todayIso()

  const [sessionsResult, activitiesResult, employeesResult] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("employee_id, status, check_in")
      .eq("date", today)
      .order("check_in", { ascending: false }),
    supabase
      .from("employee_daily_activities")
      .select(ACTIVITY_COLUMNS)
      .eq("activity_date", today),
    supabase.from("employees").select("id, full_name").not("user_id", "is", null),
  ])

  if (sessionsResult.error) throw sessionsResult.error
  if (activitiesResult.error) throw activitiesResult.error
  if (employeesResult.error) throw employeesResult.error

  const latestSessionPerEmployee = new Map<string, { status: AttendanceStatus; check_in: string | null }>()
  for (const row of sessionsResult.data ?? []) {
    if (!latestSessionPerEmployee.has(row.employee_id)) {
      latestSessionPerEmployee.set(row.employee_id, { status: row.status, check_in: row.check_in })
    }
  }

  const activitiesByEmployee = new Map<string, RawActivityRow[]>()
  for (const row of (activitiesResult.data ?? []) as unknown as RawActivityRow[]) {
    const list = activitiesByEmployee.get(row.employee_id) ?? []
    list.push(row)
    activitiesByEmployee.set(row.employee_id, list)
  }

  return (employeesResult.data ?? [])
    .map((employee) => {
      const session = latestSessionPerEmployee.get(employee.id)
      const activities = activitiesByEmployee.get(employee.id) ?? []
      const currentActivity = activities.find((activity) => activity.status === "in_progress") ?? null

      return {
        employeeId: employee.id as string,
        employeeName: employee.full_name as string,
        checkInTime: session?.check_in ?? null,
        attendanceStatus: session?.status ?? null,
        currentActivityTitle: currentActivity?.activity_title ?? null,
        currentActivityStartedAt: currentActivity?.started_at ?? null,
        completedToday: activities.filter((activity) => activity.status === "completed").length,
        pendingToday: activities.filter((activity) => activity.status === "pending").length,
      }
    })
    .filter((entry) => entry.checkInTime !== null)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

export async function getActivityLog(supabase: SupabaseClient, filters: ActivityLogFilters = {}): Promise<DailyActivity[]> {
  let query = supabase
    .from("employee_daily_activities")
    .select(ACTIVITY_COLUMNS)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.from) query = query.gte("activity_date", filters.from)
  if (filters.to) query = query.lte("activity_date", filters.to)
  if (filters.search) query = query.ilike("activity_title", `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as RawActivityRow[]
  const names = await resolveEmployeeNames(supabase, rows.map((row) => row.employee_id))

  return rows.map((row) => toActivity(row, names.get(row.employee_id) ?? "Unknown"))
}

export async function exportActivityLogCsv(supabase: SupabaseClient, filters: ActivityLogFilters = {}): Promise<string> {
  const activities = await getActivityLog(supabase, filters)

  const header = "Employee,Date,Activity,Status,Started,Completed,Duration (min),Notes"
  const lines = activities.map((activity) => {
    const started = activity.startedAt ? new Date(activity.startedAt).toISOString() : ""
    const completed = activity.completedAt ? new Date(activity.completedAt).toISOString() : ""
    const notes = (activity.notes ?? "").replace(/"/g, '""')
    const title = activity.activityTitle.replace(/"/g, '""')

    return `"${activity.employeeName}",${activity.activityDate},"${title}",${activity.status},${started},${completed},${activity.durationMinutes ?? ""},"${notes}"`
  })

  return [header, ...lines].join("\n")
}

// ---------------------------------------------------------------------------
// Manager-only mutations (any employee's activity)
// ---------------------------------------------------------------------------

export async function managerUpdateActivity(
  supabase: SupabaseClient,
  activityId: string,
  input: UpdateActivityInput
): Promise<void> {
  const { error } = await supabase
    .from("employee_daily_activities")
    .update({
      ...(input.activityTitle !== undefined ? { activity_title: input.activityTitle } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    })
    .eq("id", activityId)

  if (error) throw error

  await logActivityEvent(supabase, { entity_id: activityId, action: "manager_updated", description: "Updated by a manager." })
}

export async function managerDeleteActivity(supabase: SupabaseClient, activityId: string): Promise<void> {
  const { error } = await supabase.from("employee_daily_activities").delete().eq("id", activityId)
  if (error) throw error

  await logActivityEvent(supabase, { entity_id: activityId, action: "manager_deleted", description: "Deleted by a manager." })
}

// Resets the activity back to Pending with a clean slate - the simplest
// reading of "reopen" that doesn't leave stale timestamps/duration behind.
export async function managerReopenActivity(supabase: SupabaseClient, activityId: string): Promise<void> {
  const { error } = await supabase
    .from("employee_daily_activities")
    .update({ status: "pending", started_at: null, completed_at: null, duration_minutes: null })
    .eq("id", activityId)

  if (error) throw error

  await logActivityEvent(supabase, { entity_id: activityId, action: "manager_reopened", description: "Reopened by a manager." })
}
