import type { SupabaseClient, User } from "@supabase/supabase-js"

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
