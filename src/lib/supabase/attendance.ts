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

export async function getTodayAttendance(supabase: SupabaseClient, employeeId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("date", todayIso())
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

export async function startWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
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

  if (error) {
    if (error.code === "23505") throw new Error("You've already started work today.")
    throw error
  }

  await logActivity(supabase, { entity_id: data.id as string, action: "started_work", description: "Started work." })
}

export async function startBreak(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const record = await getTodayAttendance(supabase, employeeId)
  if (!record || record.status !== "working") {
    throw new Error("Start work before taking a break.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(record.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "on_break",
      total_worked_seconds: record.totalWorkedSeconds + elapsedSeconds,
      current_segment_started_at: now.toISOString(),
    })
    .eq("id", record.id)
    .eq("status", "working")
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to start a break right now - refresh and try again.")

  await logActivity(supabase, { entity_id: record.id, action: "started_break", description: "Started a break." })
}

export async function resumeWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const record = await getTodayAttendance(supabase, employeeId)
  if (!record || record.status !== "on_break") {
    throw new Error("Start a break before you can resume work.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(record.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "working",
      total_break_seconds: record.totalBreakSeconds + elapsedSeconds,
      current_segment_started_at: now.toISOString(),
    })
    .eq("id", record.id)
    .eq("status", "on_break")
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to resume work right now - refresh and try again.")

  await logActivity(supabase, { entity_id: record.id, action: "resumed_work", description: "Resumed work." })
}

export async function endWork(supabase: SupabaseClient, employeeId: string): Promise<void> {
  const record = await getTodayAttendance(supabase, employeeId)
  if (!record || (record.status !== "working" && record.status !== "on_break")) {
    throw new Error("There is no active work session to end.")
  }

  const now = new Date()
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(record.currentSegmentStartedAt as string).getTime()) / 1000)
  )

  const update =
    record.status === "working"
      ? { total_worked_seconds: record.totalWorkedSeconds + elapsedSeconds, total_break_seconds: record.totalBreakSeconds }
      : { total_break_seconds: record.totalBreakSeconds + elapsedSeconds, total_worked_seconds: record.totalWorkedSeconds }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      ...update,
      status: "finished",
      check_out: now.toISOString(),
      current_segment_started_at: null,
    })
    .eq("id", record.id)
    .in("status", ["working", "on_break"])
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Unable to end work right now - refresh and try again.")

  await logActivity(supabase, { entity_id: record.id, action: "ended_work", description: "Ended work for the day." })
}

export async function getAttendanceDashboardSummary(supabase: SupabaseClient): Promise<AttendanceDashboardSummary> {
  const { data, error } = await supabase.from("attendance_records").select("status").eq("date", todayIso())
  if (error) throw error

  const rows = data ?? []
  return {
    working: rows.filter((row) => row.status === "working").length,
    onBreak: rows.filter((row) => row.status === "on_break").length,
    finished: rows.filter((row) => row.status === "finished").length,
    absent: rows.filter((row) => row.status === "absent").length,
    autoClosed: rows.filter((row) => row.status === "auto_closed").length,
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

export async function getAttendanceHistory(
  supabase: SupabaseClient,
  filters: AttendanceHistoryFilters = {}
): Promise<AttendanceRecord[]> {
  let query = supabase.from("attendance_records").select(ATTENDANCE_COLUMNS).order("date", { ascending: false })

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
