import type { SupabaseClient } from "@supabase/supabase-js"

import { getSettingsBundle } from "@/lib/supabase/settings"
import { STAGE_SEQUENCE } from "@/types/production"
import type {
  EmployeeOption,
  ProductionJobDetail,
  ProductionJobListItem,
  ProductionJobStatus,
  ProductionKpis,
  ProductionPriority,
  ProductionStageDetail,
  TimelineEvent,
} from "@/types/production"

interface GetProductionJobsFilters {
  status?: ProductionJobStatus
  priority?: ProductionPriority
  search?: string
}

const PRODUCTION_JOB_COLUMNS = `
  id, job_number, status, priority, due_date, created_at,
  assigned_employee:profiles!production_jobs_assigned_to_fkey(full_name),
  order_item:order_items(
    id, description,
    order:orders(id, order_number, customer:customers(full_name))
  )
`

export async function getProductionJobs(
  supabase: SupabaseClient,
  filters: GetProductionJobsFilters = {}
): Promise<ProductionJobListItem[]> {
  let query = supabase
    .from("production_jobs")
    .select(PRODUCTION_JOB_COLUMNS)
    .order("created_at", { ascending: false })

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority)
  }

  if (filters.search) {
    query = query.ilike("job_number", `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as ProductionJobListItem[]
}

export async function getProductionStats(supabase: SupabaseClient): Promise<ProductionKpis> {
  const { data, error } = await supabase.from("production_jobs").select("status, due_date")
  if (error) throw error

  const rows = data ?? []
  const today = new Date().toISOString().slice(0, 10)

  return {
    total: rows.length,
    inProduction: rows.filter((row) => row.status === "in_progress").length,
    qualityCheck: rows.filter((row) => row.status === "quality_check").length,
    ready: rows.filter((row) => row.status === "completed").length,
    overdue: rows.filter(
      (row) => row.due_date !== null && row.due_date < today && row.status !== "completed" && row.status !== "cancelled"
    ).length,
  }
}

export async function getProductionJob(supabase: SupabaseClient, id: string): Promise<ProductionJobDetail | null> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select(
      `
      id, job_number, status, priority, due_date, notes, started_at, completed_at, created_at,
      assigned_employee:profiles!production_jobs_assigned_to_fkey(id, full_name, email),
      order_item:order_items(
        id, description, specifications, quantity, unit_price,
        order:orders(id, order_number, customer:customers(id, full_name, email, phone))
      ),
      stages:production_stages(id, stage_name, sequence, status, started_at, completed_at)
      `
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const job = data as unknown as ProductionJobDetail
  job.stages = [...job.stages].sort((a, b) => a.sequence - b.sequence)
  return job
}

export async function getProductionJobsForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ id: string; job_number: string }[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("id, job_number, order_item:order_items!inner(order_id)")
    .eq("order_item.order_id", orderId)

  if (error) throw error

  return (data ?? []).map((row) => ({ id: row.id as string, job_number: row.job_number as string }))
}

export async function getEmployees(supabase: SupabaseClient): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, profile:profiles(full_name, email)")
    .eq("employment_status", "active")

  if (error) throw error

  return (data ?? []).map((row) => {
    const profile = row.profile as unknown as { full_name: string; email: string | null } | null
    return {
      id: row.id as string,
      full_name: profile?.full_name ?? "Unknown",
      email: profile?.email ?? null,
    }
  })
}

export async function getProductionTimeline(supabase: SupabaseClient, jobId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, description, created_at, actor_id")
    .eq("entity_type", "production_job")
    .eq("entity_id", jobId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as TimelineEvent[]
}

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("activity_logs").insert({
    entity_type: "production_job",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })

  if (error) throw error
}

// Idempotent: safe to call repeatedly for the same order. For each order
// item, an existing production_job (if any) is reused rather than
// duplicated - this is enforced here regardless of what the calling UI
// shows or hides, since the schema has no unique constraint on
// order_item_id to enforce it at the database level.
export async function createProductionJob(supabase: SupabaseClient, orderId: string): Promise<string[]> {
  const { data: items, error: itemsError } = await supabase.from("order_items").select("id").eq("order_id", orderId)

  if (itemsError) throw itemsError
  if (!items || items.length === 0) {
    throw new Error("This order has no items to release to production.")
  }

  const itemIds = items.map((item) => item.id as string)

  // Falls back to the schema's own column default ("normal") when the
  // caller's session can't read the settings table (RLS restricts it to
  // admins) - same behavior as before this setting existed.
  const settings = await getSettingsBundle(supabase)
  const defaultPriority = settings.businessRules.defaultProductionPriority

  const { data: existingJobs, error: existingError } = await supabase
    .from("production_jobs")
    .select("id, order_item_id")
    .in("order_item_id", itemIds)

  if (existingError) throw existingError

  const existingByItemId = new Map((existingJobs ?? []).map((job) => [job.order_item_id, job.id as string]))
  const jobIds: string[] = []

  for (const itemId of itemIds) {
    const existingJobId = existingByItemId.get(itemId)
    if (existingJobId) {
      jobIds.push(existingJobId)
      continue
    }

    const { data: job, error: jobError } = await supabase
      .from("production_jobs")
      .insert({ order_item_id: itemId, priority: defaultPriority })
      .select("id")
      .single()

    if (jobError) throw jobError

    const jobId = job.id as string

    const { error: stagesError } = await supabase.from("production_stages").insert(
      STAGE_SEQUENCE.map((stageName, index) => ({
        production_job_id: jobId,
        stage_name: stageName,
        sequence: index + 1,
        status: "pending" as const,
      }))
    )

    if (stagesError) {
      // Roll back the job so we don't leave a stage-less job behind.
      await supabase.from("production_jobs").delete().eq("id", jobId)
      throw stagesError
    }

    await logActivity(supabase, { entity_id: jobId, action: "created", description: "Production job created." })

    jobIds.push(jobId)
  }

  return jobIds
}

export async function assignEmployee(supabase: SupabaseClient, jobId: string, employeeId: string): Promise<void> {
  const { error } = await supabase.from("production_jobs").update({ assigned_to: employeeId }).eq("id", jobId)
  if (error) throw error

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", employeeId).maybeSingle()

  await logActivity(supabase, {
    entity_id: jobId,
    action: "assigned",
    description: profile ? `Assigned to ${profile.full_name}.` : "Employee assigned.",
  })
}

type ProductionStatusAction = "advance" | "cancel"

export async function updateStatus(supabase: SupabaseClient, jobId: string, action: ProductionStatusAction): Promise<void> {
  const { data: job, error: jobError } = await supabase
    .from("production_jobs")
    .select("id, status")
    .eq("id", jobId)
    .single()

  if (jobError) throw jobError

  if (job.status === "completed" || job.status === "cancelled") {
    throw new Error("This job has already finished and cannot be updated.")
  }

  if (action === "cancel") {
    const { error: cancelError } = await supabase.from("production_jobs").update({ status: "cancelled" }).eq("id", jobId)
    if (cancelError) throw cancelError

    const { error: skipError } = await supabase
      .from("production_stages")
      .update({ status: "skipped" })
      .eq("production_job_id", jobId)
      .in("status", ["pending", "in_progress"])

    if (skipError) throw skipError

    await logActivity(supabase, {
      entity_id: jobId,
      action: "status_changed",
      description: "Production job cancelled.",
    })

    return
  }

  const { data: stages, error: stagesError } = await supabase
    .from("production_stages")
    .select("id, stage_name, status, sequence")
    .eq("production_job_id", jobId)
    .order("sequence", { ascending: true })

  if (stagesError) throw stagesError
  if (!stages || stages.length === 0) throw new Error("This job has no production stages.")

  const stageList = stages as {
    id: string
    stage_name: ProductionStageDetail["stage_name"]
    status: ProductionStageDetail["status"]
    sequence: number
  }[]

  const inProgressStage = stageList.find((stage) => stage.status === "in_progress")
  const now = new Date().toISOString()

  if (!inProgressStage) {
    // Nothing started yet - this is the Queued -> Casting transition.
    const firstStage = stageList.find((stage) => stage.sequence === 1)
    if (!firstStage) throw new Error("There is no stage available to start.")

    const { error } = await supabase
      .from("production_stages")
      .update({ status: "in_progress", started_at: now })
      .eq("id", firstStage.id)
    if (error) throw error

    const { error: jobUpdateError } = await supabase
      .from("production_jobs")
      .update({ status: "in_progress", started_at: now })
      .eq("id", jobId)
    if (jobUpdateError) throw jobUpdateError

    await logActivity(supabase, {
      entity_id: jobId,
      action: "status_changed",
      description: "Casting started.",
    })

    return
  }

  // Complete the current stage and activate the next one, if any.
  const { error: completeError } = await supabase
    .from("production_stages")
    .update({ status: "completed", completed_at: now })
    .eq("id", inProgressStage.id)
  if (completeError) throw completeError

  const nextStage = stageList.find((stage) => stage.sequence === inProgressStage.sequence + 1)

  if (nextStage) {
    const { error: nextError } = await supabase
      .from("production_stages")
      .update({ status: "in_progress", started_at: now })
      .eq("id", nextStage.id)
    if (nextError) throw nextError

    const nextJobStatus: ProductionJobStatus = nextStage.stage_name === "quality_check" ? "quality_check" : "in_progress"

    const { error: jobUpdateError } = await supabase
      .from("production_jobs")
      .update({ status: nextJobStatus })
      .eq("id", jobId)
    if (jobUpdateError) throw jobUpdateError

    await logActivity(supabase, {
      entity_id: jobId,
      action: "status_changed",
      description: `Stage advanced to ${nextStage.stage_name.replace("_", " ")}.`,
    })
  } else {
    const { error: jobUpdateError } = await supabase
      .from("production_jobs")
      .update({ status: "completed", completed_at: now })
      .eq("id", jobId)
    if (jobUpdateError) throw jobUpdateError

    await logActivity(supabase, {
      entity_id: jobId,
      action: "ready",
      description: "Production job is ready.",
    })
  }
}
