import type { SupabaseClient } from "@supabase/supabase-js"

import type { Department, UserRole } from "@/types/profile"
import type {
  EmployeeAssignments,
  EmployeeDashboardStats,
  EmployeeDetail,
  EmployeeFormInput,
  EmployeeListItem,
  EmployeeLinkedAccount,
  EmployeeTimelineEvent,
  EmploymentStatus,
} from "@/types/employee"

const EMPLOYEE_COLUMNS =
  "id, full_name, email, phone, department, position, hire_date, employment_status, user_id, termination_date, created_at"

interface RawEmployeeRow {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  department: Department | null
  position: string | null
  hire_date: string | null
  employment_status: EmploymentStatus
  user_id: string | null
  termination_date: string | null
  created_at: string
}

interface GetEmployeesFilters {
  search?: string
  employmentStatus?: EmploymentStatus
  department?: Department
  role?: UserRole
}

async function resolveLinkedAccounts(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, EmployeeLinkedAccount>> {
  if (userIds.length === 0) return new Map()

  const { data, error } = await supabase.from("profiles").select("id, role, account_status").in("id", userIds)
  if (error) throw error

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      { userId: row.id as string, role: row.role as UserRole, accountStatus: row.account_status } as EmployeeLinkedAccount,
    ])
  )
}

function toListItem(row: RawEmployeeRow, linkedAccounts: Map<string, EmployeeLinkedAccount>): EmployeeListItem {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    position: row.position,
    hire_date: row.hire_date,
    employment_status: row.employment_status,
    linkedAccount: row.user_id ? (linkedAccounts.get(row.user_id) ?? null) : null,
  }
}

export async function getEmployees(
  supabase: SupabaseClient,
  filters: GetEmployeesFilters = {}
): Promise<EmployeeListItem[]> {
  let query = supabase.from("employees").select(EMPLOYEE_COLUMNS)

  if (filters.employmentStatus) query = query.eq("employment_status", filters.employmentStatus)
  if (filters.department) query = query.eq("department", filters.department)

  if (filters.search) {
    const pattern = `%${filters.search}%`
    query = query.or(`full_name.ilike.${pattern},position.ilike.${pattern}`)
  }

  if (filters.role) {
    const { data: matchingProfiles, error: roleError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", filters.role)
    if (roleError) throw roleError

    const ids = (matchingProfiles ?? []).map((row) => row.id)
    if (ids.length === 0) return []
    query = query.in("user_id", ids)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as RawEmployeeRow[]
  const linkedAccounts = await resolveLinkedAccounts(
    supabase,
    rows.filter((row) => row.user_id).map((row) => row.user_id as string)
  )

  return rows.map((row) => toListItem(row, linkedAccounts)).sort((a, b) => a.full_name.localeCompare(b.full_name))
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
  const { data, error } = await supabase.from("employees").select(EMPLOYEE_COLUMNS).eq("id", id).maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as RawEmployeeRow
  const linkedAccounts = await resolveLinkedAccounts(supabase, row.user_id ? [row.user_id] : [])

  return {
    ...toListItem(row, linkedAccounts),
    termination_date: row.termination_date,
    created_at: row.created_at,
  }
}

export async function getEmployeeAssignments(
  supabase: SupabaseClient,
  userId: string | null
): Promise<EmployeeAssignments> {
  // An employee with no linked CRM account can never appear in assigned_to
  // (it references profiles.id) - there is nothing to look up.
  if (!userId) return { productionJobs: [], tasks: [] }

  const [jobsResult, tasksResult] = await Promise.all([
    supabase
      .from("production_jobs")
      .select("id, job_number, status")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, status")
      .eq("assigned_to", userId)
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

// Creates a standalone HR record. No CRM account is created or required -
// see types/employee.ts for why employees and CRM accounts are separate.
// Use createUserAccount() (lib/supabase/user-accounts.ts) to grant this
// person CRM access afterward.
export async function createEmployee(supabase: SupabaseClient, input: EmployeeFormInput): Promise<string> {
  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      department: input.department || null,
      position: input.position,
      hire_date: input.hire_date,
      employment_status: input.employment_status,
    })
    .select("id")
    .single()

  if (error) throw error

  const employeeId = data.id as string
  await logActivity(supabase, { entity_id: employeeId, action: "created", description: `${input.full_name} added as an employee.` })

  return employeeId
}

export async function updateEmployee(supabase: SupabaseClient, id: string, input: EmployeeFormInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("employees")
    .select("employment_status")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      department: input.department || null,
      position: input.position,
      hire_date: input.hire_date,
      employment_status: input.employment_status,
    })
    .eq("id", id)

  if (error) throw error

  await logActivity(supabase, { entity_id: id, action: "updated", description: "Employee details updated." })

  if (existing.employment_status !== input.employment_status) {
    await logActivity(supabase, {
      entity_id: id,
      action: "status_changed",
      description: `Employment status changed to ${input.employment_status.replace("_", " ")}.`,
    })
  }
}
