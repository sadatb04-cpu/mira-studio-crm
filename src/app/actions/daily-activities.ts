"use server"

import { revalidatePath } from "next/cache"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { getLinkedEmployeeId } from "@/lib/supabase/attendance"
import { requireModulePermission, requireSpecialPermission } from "@/lib/supabase/permissions"
import {
  completeActivity as completeActivityQuery,
  createActivity as createActivityQuery,
  exportActivityLogCsv as exportActivityLogCsvQuery,
  managerDeleteActivity as managerDeleteActivityQuery,
  managerReopenActivity as managerReopenActivityQuery,
  managerUpdateActivity as managerUpdateActivityQuery,
  startActivity as startActivityQuery,
  updateOwnActivity as updateOwnActivityQuery,
} from "@/lib/supabase/daily-activities"
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/daily-activity"
import type { CreateActivityInput, UpdateActivityInput } from "@/lib/validations/daily-activity"
import type { ActivityLogFilters } from "@/types/daily-activity"

export interface ActivityActionState {
  error?: string
}

// Same "resolve the caller's own linked employee id server-side" pattern
// as app/actions/attendance.ts's getCurrentEmployeeId - never trusts a
// client-supplied employee id.
async function getCurrentEmployeeId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("You must be signed in.")

  const employeeId = await getLinkedEmployeeId(supabase, user.id)
  if (!employeeId) throw new Error("Your account is not linked to an employee record.")

  return employeeId
}

export async function createActivity(input: CreateActivityInput): Promise<ActivityActionState> {
  const validated = createActivitySchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await createActivityQuery(supabase, employeeId, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to log this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function startActivity(activityId: string): Promise<ActivityActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await startActivityQuery(supabase, employeeId, activityId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function completeActivity(activityId: string): Promise<ActivityActionState> {
  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await completeActivityQuery(supabase, employeeId, activityId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to complete this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function updateOwnActivity(activityId: string, input: UpdateActivityInput): Promise<ActivityActionState> {
  const validated = updateActivitySchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    const employeeId = await getCurrentEmployeeId(supabase)
    await updateOwnActivityQuery(supabase, employeeId, activityId, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function managerUpdateActivity(activityId: string, input: UpdateActivityInput): Promise<ActivityActionState> {
  const validated = updateActivitySchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "attendance", "edit")
    await managerUpdateActivityQuery(supabase, activityId, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function managerDeleteActivity(activityId: string): Promise<ActivityActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "attendance", "delete")
    await managerDeleteActivityQuery(supabase, activityId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function managerReopenActivity(activityId: string): Promise<ActivityActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "attendance", "edit")
    await managerReopenActivityQuery(supabase, activityId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reopen this activity." }
  }

  revalidatePath("/attendance")
  return {}
}

export async function exportActivityLogCsv(filters: ActivityLogFilters): Promise<ActivityActionState & { csv?: string }> {
  const supabase = await createClient()

  try {
    await requireSpecialPermission(supabase, "export_reports")
    const csv = await exportActivityLogCsvQuery(supabase, filters)
    return { csv }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export activities." }
  }
}
