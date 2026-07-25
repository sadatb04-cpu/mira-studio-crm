import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

// This client uses the service_role (secret) key, which bypasses RLS
// entirely. It must NEVER be imported by any "use client" component and
// must NEVER be used for routine application queries - only for the
// handful of Supabase Auth Admin API operations (create/invite user,
// reset password, ban/unban) that have no equivalent under the anon or
// authenticated roles. Every caller of createAdminClient() must first
// pass requireAdmin() so a non-admin session can never reach it.
// `import "server-only"` above makes any accidental client-side import a
// build-time error rather than a silent leak.
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.")
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Verifies the CURRENT request's authenticated session belongs to an
// admin, using the normal cookie-based client (subject to RLS) - never
// trusts a client-supplied role/id. Every admin server action calls this
// before constructing an admin client.
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("You must be signed in.")

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (error) throw error
  if (profile.role !== "admin") throw new Error("Only admins can perform this action.")

  return { id: user.id, email: user.email ?? "" }
}
