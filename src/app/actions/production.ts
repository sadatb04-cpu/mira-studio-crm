"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission, requireSpecialPermission } from "@/lib/supabase/permissions"
import {
  assignEmployee as assignEmployeeQuery,
  createProductionJob as createProductionJobQuery,
  updateStatus as updateStatusQuery,
} from "@/lib/supabase/production"
import { assignEmployeeSchema, releaseOrderSchema, updateProductionStatusSchema } from "@/lib/validations/production"

export interface ProductionActionState {
  error?: string
}

export async function createProductionJob(orderId: string): Promise<ProductionActionState> {
  const validated = releaseOrderSchema.safeParse({ order_id: orderId })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let jobIds: string[]
  try {
    await requireSpecialPermission(supabase, "release_to_production")
    // createProductionJobQuery is idempotent: it checks for an existing
    // production_job per order_item and reuses it instead of inserting a
    // duplicate, so calling this again for an already-released order is safe.
    jobIds = await createProductionJobQuery(supabase, validated.data.order_id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to release order to production." }
  }

  if (jobIds.length === 1) {
    redirect(`/production/${jobIds[0]}?released=1`)
  }

  redirect(`/production?released=${jobIds.length}`)
}

export async function assignEmployee(jobId: string, employeeId: string): Promise<ProductionActionState> {
  const validated = assignEmployeeSchema.safeParse({ job_id: jobId, employee_id: employeeId })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "production", "edit")
    await assignEmployeeQuery(supabase, validated.data.job_id, validated.data.employee_id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to assign employee." }
  }

  return {}
}

export async function updateProductionStatus(
  jobId: string,
  action: "advance" | "cancel"
): Promise<ProductionActionState> {
  const validated = updateProductionStatusSchema.safeParse({ job_id: jobId, action })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "production", "edit")
    await updateStatusQuery(supabase, validated.data.job_id, validated.data.action)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update production status." }
  }

  return {}
}
