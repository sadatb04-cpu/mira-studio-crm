import type { SupabaseClient } from "@supabase/supabase-js"

import type { AccountStatus, CreateUserAccountInput, UnlinkedEmployeeOption, UserAccountListItem } from "@/types/user-account"

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

// Creates a real CRM login by inviting the person via Supabase Auth (they
// set their own password from the invite email - the admin never handles
// a plaintext credential). adminClient must come from createAdminClient()
// and the caller must already have passed requireAdmin().
export async function createUserAccount(
  adminClient: SupabaseClient,
  supabase: SupabaseClient,
  input: CreateUserAccountInput,
  actorId: string
): Promise<string> {
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
  })

  if (inviteError || !inviteData.user) {
    throw new Error(inviteError?.message ?? "Unable to invite user.")
  }

  const newUserId = inviteData.user.id

  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUserId,
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    department: input.department || null,
    account_status: "pending_invite",
  })

  if (profileError) {
    // Roll back the auth user so this doesn't leave an orphaned invite
    // with no matching profile.
    await adminClient.auth.admin.deleteUser(newUserId)
    throw profileError
  }

  if (input.employeeId) {
    const { error: linkError } = await supabase.from("employees").update({ user_id: newUserId }).eq("id", input.employeeId)
    if (linkError) throw linkError
  }

  await logActivity(supabase, {
    entity_id: newUserId,
    action: "user_created",
    description: `Invited ${input.fullName} (${input.email}) as ${input.role}.`,
    actor_id: actorId,
  })

  return newUserId
}

// resetPasswordForEmail is available on the regular (non-admin) client -
// it triggers Supabase's own configured recovery email flow. Gating this
// to admins happens at the server-action layer (requireAdmin()), not
// because the call itself needs the service-role key.
export async function resetUserPassword(
  supabase: SupabaseClient,
  targetUserId: string,
  targetEmail: string,
  actorId: string
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail)
  if (error) throw error

  await logActivity(supabase, {
    entity_id: targetUserId,
    action: "password_reset_requested",
    description: `Password reset email sent to ${targetEmail}.`,
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
