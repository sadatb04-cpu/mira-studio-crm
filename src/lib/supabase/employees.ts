import type { SupabaseClient } from "@supabase/supabase-js"

import type { Department, UserRole } from "@/types/profile"
import type {
  AvailableProfileOption,
  EmployeeAssignments,
  EmployeeDashboardStats,
  EmployeeDetail,
  EmployeeFormInput,
  EmployeeListItem,
  EmployeeTimelineEvent,
  EmploymentStatus,
} from "@/types/employee"
import type { CreateEmployeeInput } from "@/lib/validations/employee"

const EMPLOYEE_LIST_COLUMNS = `
  id, position, hire_date, employment_status,
  profile:profiles!inner(id, full_name, email, phone, role, department, avatar_url)
`

interface GetEmployeesFilters {
  search?: string
  employmentStatus?: EmploymentStatus
  department?: Department
  role?: UserRole
}

export async function getEmployees(
  supabase: SupabaseClient,
  filters: GetEmployeesFilters = {}
): Promise<EmployeeListItem[]> {
  if (filters.search) {
    // PostgREST can't OR a root column (position) with a joined column
    // (profile.full_name) in a single query - same limitation as the
    // Orders/Production search workaround, so run both and merge.
    const pattern = `%${filters.search}%`

    let byName = supabase.from("employees").select(EMPLOYEE_LIST_COLUMNS).ilike("profile.full_name", pattern)
    let byPosition = supabase.from("employees").select(EMPLOYEE_LIST_COLUMNS).ilike("position", pattern)

    if (filters.employmentStatus) {
      byName = byName.eq("employment_status", filters.employmentStatus)
      byPosition = byPosition.eq("employment_status", filters.employmentStatus)
    }
    if (filters.department) {
      byName = byName.eq("profile.department", filters.department)
      byPosition = byPosition.eq("profile.department", filters.department)
    }
    if (filters.role) {
      byName = byName.eq("profile.role", filters.role)
      byPosition = byPosition.eq("profile.role", filters.role)
    }

    const [nameResult, positionResult] = await Promise.all([byName, byPosition])
    if (nameResult.error) throw nameResult.error
    if (positionResult.error) throw positionResult.error

    const merged = new Map<string, EmployeeListItem>()
    for (const row of [...nameResult.data, ...positionResult.data] as unknown as EmployeeListItem[]) {
      merged.set(row.id, row)
    }

    return Array.from(merged.values()).sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name))
  }

  let query = supabase.from("employees").select(EMPLOYEE_LIST_COLUMNS)

  if (filters.employmentStatus) {
    query = query.eq("employment_status", filters.employmentStatus)
  }
  if (filters.department) {
    query = query.eq("profile.department", filters.department)
  }
  if (filters.role) {
    query = query.eq("profile.role", filters.role)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as EmployeeListItem[]
}

export async function getEmployeeDashboardStats(supabase: SupabaseClient): Promise<EmployeeDashboardStats> {
  const { data, error } = await supabase.from("employees").select("employment_status, hire_date")
  if (error) throw error

  const rows = data ?? []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return {
    total: rows.length,
    active: rows.filter((row) => row.employment_status === "active").length,
    onLeave: rows.filter((row) => row.employment_status === "on_leave").length,
    terminated: rows.filter((row) => row.employment_status === "terminated").length,
    newHires30Days: rows.filter((row) => row.hire_date !== null && new Date(row.hire_date) >= thirtyDaysAgo).length,
  }
}

export async function getEmployee(supabase: SupabaseClient, id: string): Promise<EmployeeDetail | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(
      `
      id, position, hire_date, employment_status, termination_date, created_at,
      profile:profiles!inner(id, full_name, email, phone, role, department, avatar_url)
      `
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as EmployeeDetail | null
}

export async function getEmployeeAssignments(supabase: SupabaseClient, employeeId: string): Promise<EmployeeAssignments> {
  const [jobsResult, tasksResult] = await Promise.all([
    supabase
      .from("production_jobs")
      .select("id, job_number, status")
      .eq("assigned_to", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, status")
      .eq("assigned_to", employeeId)
      .order("created_at", { ascending: false }),
  ])

  if (jobsResult.error) throw jobsResult.error
  if (tasksResult.error) throw tasksResult.error

  return {
    productionJobs: (jobsResult.data ?? []) as unknown as EmployeeAssignments["productionJobs"],
    tasks: (tasksResult.data ?? []) as unknown as EmployeeAssignments["tasks"],
  }
}

export async function getEmployeeTimeline(supabase: SupabaseClient, employeeId: string): Promise<EmployeeTimelineEvent[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, description, created_at")
    .eq("entity_type", "employee")
    .eq("entity_id", employeeId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as EmployeeTimelineEvent[]
}

export async function getAvailableProfiles(supabase: SupabaseClient): Promise<AvailableProfileOption[]> {
  const { data: employees, error: employeesError } = await supabase.from("employees").select("id")
  if (employeesError) throw employeesError

  const existingIds = (employees ?? []).map((row) => row.id as string)

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, department")
    .order("full_name", { ascending: true })
  if (existingIds.length > 0) {
    query = query.not("id", "in", `(${existingIds.join(",")})`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as AvailableProfileOption[]
}

// Best-effort only - activity logging must never fail employee
// creation/updates (same non-throwing pattern as Orders/Tasks).
async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "employee",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function createEmployee(supabase: SupabaseClient, input: CreateEmployeeInput): Promise<string> {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      role: input.role,
    })
    .eq("id", input.profile_id)

  if (profileError) throw profileError

  const { error: employeeError } = await supabase.from("employees").insert({
    id: input.profile_id,
    position: input.position,
    hire_date: input.hire_date,
    employment_status: input.employment_status,
  })

  if (employeeError) throw employeeError

  await logActivity(supabase, {
    entity_id: input.profile_id,
    action: "created",
    description: `${input.full_name} added as an employee.`,
  })

  return input.profile_id
}

export async function updateEmployee(supabase: SupabaseClient, id: string, input: EmployeeFormInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("employees")
    .select("employment_status")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      role: input.role,
    })
    .eq("id", id)

  if (profileError) throw profileError

  const { error: employeeError } = await supabase
    .from("employees")
    .update({
      position: input.position,
      hire_date: input.hire_date,
      employment_status: input.employment_status,
    })
    .eq("id", id)

  if (employeeError) throw employeeError

  await logActivity(supabase, { entity_id: id, action: "updated", description: "Employee details updated." })

  if (existing.employment_status !== input.employment_status) {
    await logActivity(supabase, {
      entity_id: id,
      action: "status_changed",
      description: `Employment status changed to ${input.employment_status.replace("_", " ")}.`,
    })
  }
}
