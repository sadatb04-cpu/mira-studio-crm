"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/lib/supabase/profile"
import { getCachedUserPermissions } from "@/lib/supabase/permissions"
import { getFirstAccessibleRoute } from "@/lib/permission-routing"
import { loginSchema } from "@/lib/validations/auth"

export interface AuthFormState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

// Purely a UI signal for the post-login splash screen - not part of the
// session/auth state itself. Short-lived and self-clearing (see
// clearLoginSplashFlag) so a page refresh never re-shows the splash.
const SPLASH_COOKIE = "mira-show-splash"

async function logAuthActivity(
  supabase: SupabaseClient,
  entry: { actor_id: string | null; action: string; description: string }
) {
  // Best-effort only, matching the non-throwing activity logging pattern
  // used throughout the app - never let logging block a login/logout.
  await supabase.from("activity_logs").insert({
    entity_type: "profile",
    entity_id: entry.actor_id,
    action: entry.action,
    description: entry.description,
    actor_id: entry.actor_id,
  })
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(validated.data)

  if (error || !data.user) {
    // No profile id exists for a failed attempt (wrong password, or the
    // email doesn't exist at all) - logged with a null entity_id, per the
    // brief's "where possible" allowance for failed-login audit entries.
    await logAuthActivity(supabase, {
      actor_id: null,
      action: "login_failed",
      description: `Failed sign-in attempt for ${validated.data.email}.`,
    })
    return { error: error?.message ?? "Unable to sign in." }
  }

  await ensureProfile(supabase, data.user)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status, role")
    .eq("id", data.user.id)
    .single()

  if (profileError) {
    await supabase.auth.signOut()
    return { error: "Unable to verify account status." }
  }

  if (profile.account_status !== "active") {
    await logAuthActivity(supabase, {
      actor_id: data.user.id,
      action: "login_blocked",
      description: `Sign-in blocked - account status is "${profile.account_status}".`,
    })
    await supabase.auth.signOut()
    return { error: "Your account is not active. Contact an administrator." }
  }

  const [, permissions] = await Promise.all([
    logAuthActivity(supabase, { actor_id: data.user.id, action: "login", description: "Signed in." }),
    getCachedUserPermissions(data.user.id),
  ])
  const destination = getFirstAccessibleRoute(permissions, profile.role) ?? "/access-denied"

  const cookieStore = await cookies()
  cookieStore.set(SPLASH_COOKIE, "1", { maxAge: 30, path: "/" })

  redirect(destination)
}

export async function clearLoginSplashFlag() {
  const cookieStore = await cookies()
  cookieStore.delete(SPLASH_COOKIE)
}

export async function signOut() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await logAuthActivity(supabase, { actor_id: user.id, action: "logout", description: "Signed out." })
  }

  await supabase.auth.signOut()
  redirect("/login")
}
