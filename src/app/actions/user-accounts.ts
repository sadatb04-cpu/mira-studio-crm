"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminOrSpecialPermission } from "@/lib/supabase/permissions"
import {
  createUserAccount as createUserAccountQuery,
  resetUserPassword as resetUserPasswordQuery,
  setAccountStatus as setAccountStatusQuery,
} from "@/lib/supabase/user-accounts"
import { createUserAccountSchema } from "@/lib/validations/user-account"
import type { CreateUserAccountInput } from "@/lib/validations/user-account"
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

export async function resetUserPassword(userId: string, email: string): Promise<UserAccountActionState> {
  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_users")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  try {
    await resetUserPasswordQuery(supabase, userId, email, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to send password reset." }
  }

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
