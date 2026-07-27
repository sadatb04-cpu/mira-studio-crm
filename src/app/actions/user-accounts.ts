"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminOrSpecialPermission } from "@/lib/supabase/permissions"
import {
  createUserAccount as createUserAccountQuery,
  resetUserPassword as resetUserPasswordQuery,
  setAccountStatus as setAccountStatusQuery,
  updateUserRole as updateUserRoleQuery,
} from "@/lib/supabase/user-accounts"
import { createUserAccountSchema, resetPasswordSchema, updateUserRoleSchema } from "@/lib/validations/user-account"
import type { CreateUserAccountInput, ResetPasswordInput, UpdateUserRoleInput } from "@/lib/validations/user-account"
import type { AccountStatus } from "@/types/user-account"

export interface UserAccountActionState {
  error?: string
}

export async function createUserAccount(input: CreateUserAccountInput): Promise<UserAccountActionState & { id?: string }> {
  const validated = createUserAccountSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_users")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  const adminClient = createAdminClient()

  try {
    const id = await createUserAccountQuery(adminClient, supabase, validated.data, admin.id)
    revalidatePath("/settings/users")
    return { id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create user account." }
  }
}

export async function resetUserPassword(userId: string, input: ResetPasswordInput): Promise<UserAccountActionState> {
  const validated = resetPasswordSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_users")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  const adminClient = createAdminClient()

  try {
    await resetUserPasswordQuery(adminClient, supabase, userId, validated.data.newPassword, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset password." }
  }

  return {}
}

export async function updateUserRole(userId: string, input: UpdateUserRoleInput): Promise<UserAccountActionState> {
  const validated = updateUserRoleSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_users")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  try {
    await updateUserRoleQuery(supabase, userId, validated.data.role, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update role." }
  }

  revalidatePath("/settings/users")
  return {}
}

export async function setAccountStatus(userId: string, status: AccountStatus): Promise<UserAccountActionState> {
  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_users")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  const adminClient = createAdminClient()

  try {
    await setAccountStatusQuery(adminClient, supabase, userId, status, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update account status." }
  }

  revalidatePath("/settings/users")
  return {}
}
