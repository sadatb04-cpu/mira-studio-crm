"use server"

import { revalidatePath } from "next/cache"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  endWork as endWorkQuery,
  exportAttendanceHistoryCsv as exportAttendanceHistoryCsvQuery,
  getLinkedEmployeeId,
  resumeWork as resumeWorkQuery,
  startBreak as startBreakQuery,
  startWork as startWorkQuery,
} from "@/lib/supabase/attendance"
import type { AttendanceHistoryFilters } from "@/types/attendance"

export interface AttendanceActionState {
  error?: string
}

// Every clock action resolves the caller's own linked employee id
// server-side from their authenticated session rather than trusting a
// client-supplied id, so the app layer can't be used to clock in/out as
// someone else even though RLS on this table (like every other
// operational table here) is permissive by authentication only, not
// per-row ownership. attendance_records.employee_id is employees(id), not
// profiles(id) - see Security Sprint 1.0 for why those are now decoupled.
async function getCurrentEmployeeId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("You must be signed in.")

  const employeeId = await getLinkedEmployeeId(supabase, user.id)
  if (!employeeId) throw new Error("Your account is not linked to an employee record.")

  return employeeId
}

export async function startWork(): Promise<AttendanceActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await startWorkQuery(supabase, employeeId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start work." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function startBreak(): Promise<AttendanceActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await startBreakQuery(supabase, employeeId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start a break." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function resumeWork(): Promise<AttendanceActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await resumeWorkQuery(supabase, employeeId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to resume work." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function endWork(): Promise<AttendanceActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await endWorkQuery(supabase, employeeId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to end work." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function exportAttendanceHistoryCsv(
  filters: AttendanceHistoryFilters
): Promise<AttendanceActionState & { csv?: string }> {
  const supabase = await createClient()

  try {
    const csv = await exportAttendanceHistoryCsvQuery(supabase, filters)
    return { csv }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export attendance history." }
  }
}
