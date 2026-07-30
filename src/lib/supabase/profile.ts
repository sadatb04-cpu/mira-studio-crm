import { cache } from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/profile"

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) throw error
  return data as Profile
}

// Per-request memoization, same reasoning as getCachedUser() in server.ts -
// keyed on userId (a primitive) rather than a supabase client instance, so
// every caller in the same request converges on one database read
// regardless of which client object they happen to be holding.
export const getCachedProfile = cache(async (userId: string): Promise<Profile> => {
  const supabase = await createClient()
  return getProfile(supabase, userId)
})

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (existing) return

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "New User"

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    email: user.email ?? "",
    role: "employee",
    is_active: true,
  })

  if (error) throw error
}

// Verifies the current password by re-authenticating with it (Supabase has
// no separate "check this password" endpoint) before setting the new one -
// this re-auth issues a fresh session for the same user, it does not sign
// anyone out. Best-effort activity logging never blocks the actual change.
export async function changeOwnPassword(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: input.currentPassword })
  if (verifyError) throw new Error("Current password is incorrect.")

  const { error } = await supabase.auth.updateUser({ password: input.newPassword })
  if (error) throw error

  await supabase.from("activity_logs").insert({
    entity_type: "profile",
    entity_id: userId,
    action: "password_changed",
    description: "Password changed.",
    actor_id: userId,
  })
}
