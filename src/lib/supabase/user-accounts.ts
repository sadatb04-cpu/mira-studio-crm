import type { SupabaseClient } from "@supabase/supabase-js"

import type { AccountStatus, CreateUserAccountInput, UnlinkedEmployeeOption, UserAccountListItem } from "@/types/user-account"
import type { UserRole } from "@/types/profile"

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string | null; action: string; description: string; actor_id: string | null }
) {
  // Best-effort only, matching the non-throwing activity logging pattern
  // used throughout the app.
  await supabase.from("activity_logs").insert({
    entity_type: "profile",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description,
    actor_id: entry.actor_id,
  })
}

export async function getUserAccounts(supabase: SupabaseClient): Promise<UserAccountListItem[]> {
  const [profilesResult, employeesResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, department, account_status, created_at").order("created_at"),
    supabase.from("employees").select("id, full_name, user_id").not("user_id", "is", null),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (employeesResult.error) throw employeesResult.error

  const employeeByUserId = new Map(
    (employeesResult.data ?? []).map((row) => [row.user_id as string, { id: row.id as string, full_name: row.full_name as string }])
  )

  return (profilesResult.data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    department: row.department,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    linkedEmployee: employeeByUserId.get(row.id) ?? null,
  }))
}

export async function getUnlinkedEmployees(supabase: SupabaseClient): Promise<UnlinkedEmployeeOption[]> {
  const { data, error } = await supabase.from("employees").select("id, full_name, email").is("user_id", null)
  if (error) throw error

  return (data ?? [])
    .map((row) => ({ id: row.id as string, full_name: row.full_name as string, email: row.email as string | null }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
}

// Creates the login directly - this is an internal-operations CRM, not a
// public SaaS product, so accounts are created and controlled exclusively
// by admins. No invitation email is ever sent; the admin-provided password
// is handed straight to the Auth Admin API and never stored or displayed
// again after this call returns. adminClient must come from
// createAdminClient() and the caller must already have passed
// requireAdmin()/requireAdminOrSpecialPermission().
//
// Employees is the single source of truth for Attendance/HR - every
// account created here gets exactly one linked employee record, created
// automatically (or linked to an existing HR-only one, if the admin picked
// one from "Link Employee"). An admin never has to create a second
// Employee record by hand just to enable attendance; see migration 0023.
export async function createUserAccount(
  adminClient: SupabaseClient,
  supabase: SupabaseClient,
  input: CreateUserAccountInput,
  actorId: string
): Promise<string> {
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  })

  if (createError || !createData.user) {
    throw new Error(createError?.message ?? "Unable to create user.")
  }

  const newUserId = createData.user.id

  async function rollbackNewUser() {
    // Roll back the auth user (and, if it made it that far, the profile
    // row) so a failure here never leaves an orphaned login with no
    // matching profile/employee.
    await supabase.from("profiles").delete().eq("id", newUserId)
    await adminClient.auth.admin.deleteUser(newUserId)
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUserId,
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    department: input.department || null,
    account_status: "active",
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    throw profileError
  }

  if (input.employeeId) {
    // Admin explicitly linked an existing HR-only employee record - only
    // the link and employment status are touched; that record's own
    // name/email/department (entered separately via the Employees module)
    // are left exactly as they are.
    const { error: linkError } = await supabase
      .from("employees")
      .update({ user_id: newUserId, employment_status: "active" })
      .eq("id", input.employeeId)
    if (linkError) {
      await rollbackNewUser()
      throw linkError
    }
  } else {
    const { error: employeeError } = await supabase.from("employees").insert({
      user_id: newUserId,
      full_name: input.fullName,
      email: input.email,
      department: input.department || null,
      employment_status: "active",
      hire_date: new Date().toISOString().slice(0, 10),
    })
    if (employeeError) {
      await rollbackNewUser()
      throw employeeError
    }
  }

  await logActivity(supabase, {
    entity_id: newUserId,
    action: "user_created",
    description: `Created account for ${input.fullName} (${input.email}) as ${input.role}.`,
    actor_id: actorId,
  })

  return newUserId
}

// Admin assigns the new password directly via the Auth Admin API - no
// reset email is sent, and the password is never stored or displayed
// anywhere after this call returns.
export async function resetUserPassword(
  adminClient: SupabaseClient,
  supabase: SupabaseClient,
  targetUserId: string,
  newPassword: string,
  actorId: string
): Promise<void> {
  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword })
  if (error) throw error

  await logActivity(supabase, {
    entity_id: targetUserId,
    action: "password_reset",
    description: "Password reset by an administrator.",
    actor_id: actorId,
  })
}

export async function updateUserRole(
  supabase: SupabaseClient,
  targetUserId: string,
  role: UserRole,
  actorId: string
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase.from("profiles").select("role").eq("id", targetUserId).single()
  if (fetchError) throw fetchError

  if (existing.role === role) return

  const { error } = await supabase.from("profiles").update({ role }).eq("id", targetUserId)
  if (error) throw error

  await logActivity(supabase, {
    entity_id: targetUserId,
    action: "role_changed",
    description: `Role changed from ${existing.role} to ${role}.`,
    actor_id: actorId,
  })
}

const STATUS_ACTION: Record<AccountStatus, string> = {
  active: "account_enabled",
  suspended: "account_suspended",
  disabled: "account_disabled",
  pending_invite: "account_pending_invite",
}

export async function setAccountStatus(
  adminClient: SupabaseClient,
  supabase: SupabaseClient,
  targetUserId: string,
  status: AccountStatus,
  actorId: string
): Promise<void> {
  const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: status === "active" ? "none" : "876000h",
  })
  if (banError) throw banError

  const { error: profileError } = await supabase.from("profiles").update({ account_status: status }).eq("id", targetUserId)
  if (profileError) throw profileError

  await logActivity(supabase, {
    entity_id: targetUserId,
    action: STATUS_ACTION[status],
    description: `Account status changed to ${status}.`,
    actor_id: actorId,
  })
}
