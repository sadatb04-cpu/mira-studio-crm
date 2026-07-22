import type { SupabaseClient } from "@supabase/supabase-js"

import { TASK_STATUS_LABELS } from "@/types/task"
import type {
  OrderOption,
  ProductionJobOption,
  TaskDashboardStats,
  TaskDetail,
  TaskFormInput,
  TaskListItem,
  TaskPriority,
  TaskStatus,
  TaskTimelineEvent,
} from "@/types/task"

const TASK_LIST_COLUMNS = `
  id, title, status, priority, due_date, created_at,
  assigned_employee:profiles!tasks_assigned_to_fkey(id, full_name),
  order:orders(id, order_number)
`

interface GetTasksFilters {
  search?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dueFilter?: "due_today" | "overdue"
}

export async function getTasks(supabase: SupabaseClient, filters: GetTasksFilters = {}): Promise<TaskListItem[]> {
  let query = supabase.from("tasks").select(TASK_LIST_COLUMNS).order("created_at", { ascending: false })

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority)
  }

  if (filters.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo)
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  if (filters.dueFilter === "due_today") {
    query = query.eq("due_date", today)
  } else if (filters.dueFilter === "overdue") {
    query = query.lt("due_date", today).not("status", "in", "(done,cancelled)")
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as TaskListItem[]
}

export async function getTaskDashboardStats(supabase: SupabaseClient): Promise<TaskDashboardStats> {
  const { data, error } = await supabase.from("tasks").select("status, due_date")
  if (error) throw error

  const rows = data ?? []
  const today = new Date().toISOString().slice(0, 10)

  return {
    total: rows.length,
    todo: rows.filter((row) => row.status === "todo").length,
    inProgress: rows.filter((row) => row.status === "in_progress").length,
    completed: rows.filter((row) => row.status === "done").length,
    overdue: rows.filter(
      (row) => row.due_date !== null && row.due_date < today && row.status !== "done" && row.status !== "cancelled"
    ).length,
  }
}

export async function getTask(supabase: SupabaseClient, id: string): Promise<TaskDetail | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id, title, description, status, priority, due_date, completed_at, created_at,
      assigned_employee:profiles!tasks_assigned_to_fkey(id, full_name),
      order:orders(id, order_number),
      production_job:production_jobs(id, job_number)
      `
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as TaskDetail | null
}

export async function getTaskTimeline(supabase: SupabaseClient, taskId: string): Promise<TaskTimelineEvent[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, description, created_at")
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as TaskTimelineEvent[]
}

export async function getOrderOptions(supabase: SupabaseClient): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as OrderOption[]
}

export async function getProductionJobOptions(supabase: SupabaseClient): Promise<ProductionJobOption[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("id, job_number")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ProductionJobOption[]
}

// Best-effort only - per the sprint requirement, activity logging must
// never fail task creation/updates (same non-throwing pattern as
// createOrder() in orders.ts).
async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "task",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function createTask(supabase: SupabaseClient, input: TaskFormInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date,
      assigned_to: input.assigned_to || null,
      order_id: input.order_id || null,
      production_job_id: input.production_job_id || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) throw error

  const taskId = data.id as string
  await logActivity(supabase, { entity_id: taskId, action: "created", description: "Task created." })

  return taskId
}

export async function updateTask(supabase: SupabaseClient, id: string, input: TaskFormInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("status, completed_at")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Keep completed_at consistent with status, same rule updateTaskStatus()
  // already applies - otherwise leave it untouched.
  let completedAt: string | null | undefined
  if (input.status === "done" && existing.completed_at === null) {
    completedAt = new Date().toISOString()
  } else if (existing.status === "done" && input.status !== "done") {
    completedAt = null
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date,
      assigned_to: input.assigned_to || null,
      order_id: input.order_id || null,
      production_job_id: input.production_job_id || null,
      ...(completedAt !== undefined ? { completed_at: completedAt } : {}),
    })
    .eq("id", id)

  if (error) throw error

  await logActivity(supabase, { entity_id: id, action: "updated", description: "Task details updated." })
}

export async function assignTask(supabase: SupabaseClient, taskId: string, employeeId: string): Promise<void> {
  const { error } = await supabase.from("tasks").update({ assigned_to: employeeId }).eq("id", taskId)
  if (error) throw error

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", employeeId).maybeSingle()

  await logActivity(supabase, {
    entity_id: taskId,
    action: "assigned",
    description: profile ? `Assigned to ${profile.full_name}.` : "Employee assigned.",
  })
}

export async function updateTaskStatus(supabase: SupabaseClient, taskId: string, status: TaskStatus): Promise<void> {
  const updates: { status: TaskStatus; completed_at?: string } = { status }
  if (status === "done") {
    updates.completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId)
  if (error) throw error

  await logActivity(supabase, {
    entity_id: taskId,
    action: status === "done" ? "completed" : "status_changed",
    description: status === "done" ? "Task completed." : `Status changed to ${TASK_STATUS_LABELS[status]}.`,
  })
}
