import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AttendanceDashboardSummary,
  AttendanceEmployeeOption,
  AttendanceHistoryFilters,
  AttendanceRecord,
  AttendanceStatus,
} from "@/types/attendance"

const ATTENDANCE_COLUMNS =
  "id, employee_id, date, status, check_in, check_out, total_worked_seconds, total_break_seconds, current_segment_started_at, notes"

interface RawAttendanceRow {
  id: string
  employee_id: string
  date: string
  status: AttendanceStatus
  check_in: string | null
  check_out: string | null
  total_worked_seconds: number
  total_break_seconds: number
  current_segment_started_at: string | null
  notes: string | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function resolveEmployeeNames(supabase: SupabaseClient, employeeIds: string[]): Promise<Map<string, string>> {
  if (employeeIds.length === 0) return new Map()

  const { data, error } = await supabase.from("employees").select("id, full_name").in("id", employeeIds)
  if (error) throw error

  return new Map((data ?? []).map((row) => [row.id as string, row.full_name as string]))
}

function toRecord(row: RawAttendanceRow, employeeName: string): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName,
    date: row.date,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalWorkedSeconds: row.total_worked_seconds,
    totalBreakSeconds: row.total_break_seconds,
    currentSegmentStartedAt: row.current_segment_started_at,
    notes: row.notes,
  }
}

// Best-effort, idempotent reconciliation - runs before rendering every
// attendance-related page (dashboard/history/reports/employee widget) as
// the fallback for when the pg_cron schedule is unavailable or has not
// fired yet. Never throws: a reconciliation failure must never block the
// page from rendering with whatever data already exists.
export async function reconcileAttendance(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.rpc("reconcile_attendance")
  } catch {
    // Swallowed - see comment above.
  }
}

// attendance_records.employee_id references employees(id), which is now
// independent of profiles.id (see Security Sprint 1.0 - employees and CRM
// accounts are decoupled) - this resolves the logged-in user's own linked
// employees.id via employees.user_id, which is the id every clock action
// and lookup below actually needs.
export async function getLinkedEmployeeId(supabase: SupabaseClient, profileId: string): Promise<string | null> {
  const { data, error } = await supabase.from("employees").select("id").eq("user_id", profileId).maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

// Self-healing fallback for any account that predates createUserAccount()'s
// auto-provisioning (migration 0023's backfill should already cover every
// pre-existing account, but this is what guarantees "You haven't been added
// as an employee yet." can never actually surface for a valid session,
// including any gap the backfill missed). Safe for a non-admin's own
// session: the narrow "Users can create their own employee record" RLS
// policy only ever allows inserting a row where user_id = auth.uid(), and
// the unique index on employees.user_id makes a concurrent double-insert
// (e.g. two tabs loading Attendance at once) fail safely - re-fetched
// below rather than treated as an error.
export async function ensureLinkedEmployeeId(supabase: SupabaseClient, profileId: string): Promise<string> {
  const existing = await getLinkedEmployeeId(supabase, profileId)
  if (existing) return existing

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, department")
    .eq("id", profileId)
    .single()
  if (profileError) throw profileError

  const { data, error } = await supabase
    .from("employees")
    .insert({
      user_id: profileId,
      full_name: profile.full_name,
      email: profile.email,
      department: profile.department,
      employment_status: "active",
      hire_date: todayIso(),
    })
    .select("id")
    .single()

  if (error) {
    const fallback = await getLinkedEmployeeId(supabase, profileId)
    if (fallback) return fallback
    throw error
  }

  return data.id as string
}

// Every session row for today, oldest first - the full "Today's Sessions"
// history. An employee can have any number of these (Start Work -> Finish
// -> Start New Session -> ...); each is its own independent row.
export async function getTodaySessions(supabase: SupabaseClient, employeeId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("date", todayIso())
    .order("check_in", { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as RawAttendanceRow[]
  const names = await resolveEmployeeNames(supabase, [employeeId])
  const employeeName = names.get(employeeId) ?? ""

  return rows.map((row) => toRecord(row, employeeName))
}

// The most recent session for today, whatever its status - this is the
// one clock actions operate on (start a break/resume/finish always acts
// on the latest session, never an earlier finished one).
async function getActiveSession(supabase: SupabaseClient, employeeId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("date", todayIso())
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const names = await resolveEmployeeNames(supabase, [employeeId])
  return toRecord(data as unknown as RawAttendanceRow, names.get(employeeId) ?? "")
}

async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, matching the non-throwing activity logging pattern
  // used throughout the app.
  await supabase.from("activity_logs").insert({
    entity_type: "attendance_record",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

// Also used for "Start New Session" - the button label differs client-side
// depending on whether any session already exists today, but the
// underlying action (a fresh session row) is identical either way.
export async function startWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const active = await getActiveSession(supabase, employeeId)
  if (active && (active.status === "working" || active.status === "on_break")) {
    throw new Error("You already have an active session.")
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      employee_id: employeeId,
      date: todayIso(),
      status: "working",
      check_in: now,
      current_segment_started_at: now,
    })
    .select("id")
    .single()

  if (error) throw error

  await logActivity(supabase, { entity_id: data.id as string, action: "started_work", description: "Started work." })
}

export async function startBreak(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const session = await getActiveSession(supabase, employeeId)
  if (!session || session.status !== "working") {
    throw new Error("Start work before taking a break.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "on_break",
      total_worked_seconds: session.totalWorkedSeconds + elapsedSeconds,
      current_segment_started_at: now.toISOString(),
    })
    .eq("id", session.id)
    .eq("status", "working")
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to start a break right now - refresh and try again.")

  await logActivity(supabase, { entity_id: session.id, action: "started_break", description: "Started a break." })
}

export async function resumeWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const session = await getActiveSession(supabase, employeeId)
  if (!session || session.status !== "on_break") {
    throw new Error("Start a break before you can resume work.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "working",
      total_break_seconds: session.totalBreakSeconds + elapsedSeconds,
      current_segment_started_at: now.toISOString(),
    })
    .eq("id", session.id)
    .eq("status", "on_break")
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to resume work right now - refresh and try again.")

  await logActivity(supabase, { entity_id: session.id, action: "resumed_work", description: "Resumed work." })
}

export async function endWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const session = await getActiveSession(supabase, employeeId)
  if (!session || (session.status !== "working" && session.status !== "on_break")) {
    throw new Error("There is no active work session to end.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const update =
    session.status === "working"
      ? { total_worked_seconds: session.totalWorkedSeconds + elapsedSeconds, total_break_seconds: session.totalBreakSeconds }
      : { total_break_seconds: session.totalBreakSeconds + elapsedSeconds, total_worked_seconds: session.totalWorkedSeconds }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      ...update,
      status: "finished",
      check_out: now.toISOString(),
      current_segment_started_at: null,
    })
    .eq("id", session.id)
    .in("status", ["working", "on_break"])
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to end work right now - refresh and try again.")

  await logActivity(supabase, { entity_id: session.id, action: "ended_work", description: "Ended this session." })
}

export async function getAttendanceDashboardSummary(supabase: SupabaseClient): Promise<AttendanceDashboardSummary> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("employee_id, status, check_in")
    .eq("date", todayIso())
    .order("check_in", { ascending: false })

  if (error) throw error

  // An employee can have several session rows for today - the dashboard
  // reflects each EMPLOYEE's current state once, using their most recent
  // session (rows already ordered latest-first, so the first row seen per
  // employee_id wins).
  const latestPerEmployee = new Map<string, AttendanceStatus>()
  for (const row of data ?? []) {
    if (!latestPerEmployee.has(row.employee_id)) {
      latestPerEmployee.set(row.employee_id, row.status)
    }
  }

  const statuses = [...latestPerEmployee.values()]
  return {
    working: statuses.filter((status) => status === "working").length,
    onBreak: statuses.filter((status) => status === "on_break").length,
    finished: statuses.filter((status) => status === "finished").length,
    absent: statuses.filter((status) => status === "absent").length,
    autoClosed: statuses.filter((status) => status === "auto_closed").length,
  }
}

export async function getAttendanceEmployeeOptions(supabase: SupabaseClient): Promise<AttendanceEmployeeOption[]> {
  // Only employees linked to a CRM account can ever have attendance
  // records (clocking in requires being able to log in).
  const { data, error } = await supabase.from("employees").select("id, full_name").not("user_id", "is", null)
  if (error) throw error

  return (data ?? [])
    .map((row) => ({ id: row.id as string, name: row.full_name as string }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Each row is one session, so a single employee/day can now legitimately
// appear as multiple rows here - that's intentional (a manager reviewing
// history can see individual sessions, useful for split-shift employees).
export async function getAttendanceHistory(
  supabase: SupabaseClient,
  filters: AttendanceHistoryFilters = {}
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLUMNS)
    .order("date", { ascending: false })
    .order("check_in", { ascending: false })

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.from) query = query.gte("date", filters.from)
  if (filters.to) query = query.lte("date", filters.to)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as RawAttendanceRow[]
  const names = await resolveEmployeeNames(supabase, [...new Set(rows.map((row) => row.employee_id))])

  return rows.map((row) => toRecord(row, names.get(row.employee_id) ?? "Unknown"))
}

export async function exportAttendanceHistoryCsv(
  supabase: SupabaseClient,
  filters: AttendanceHistoryFilters = {}
): Promise<string> {
  const records = await getAttendanceHistory(supabase, filters)

  const header = "Employee,Date,Check In,Check Out,Worked Time (hrs),Break Time (hrs),Status,Notes"
  const lines = records.map((record) => {
    const checkIn = record.checkIn ? new Date(record.checkIn).toISOString() : ""
    const checkOut = record.checkOut ? new Date(record.checkOut).toISOString() : ""
    const workedHours = (record.totalWorkedSeconds / 3600).toFixed(2)
    const breakHours = (record.totalBreakSeconds / 3600).toFixed(2)
    const notes = (record.notes ?? "").replace(/"/g, '""')

    return `"${record.employeeName}",${record.date},${checkIn},${checkOut},${workedHours},${breakHours},${record.status},"${notes}"`
  })

  return [header, ...lines].join("\n")
}
