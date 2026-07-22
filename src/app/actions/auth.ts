"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/lib/supabase/profile"
import { loginSchema, signupSchema } from "@/lib/validations/auth"

export interface AuthFormState {
  error?: string
  fieldErrors?: Record<string, string[]>
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
    return { error: error?.message ?? "Unable to sign in." }
  }

  await ensureProfile(supabase, data.user)

  redirect("/")
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: { full_name: validated.data.fullName },
    },
  })

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to create account." }
  }

  // If the project auto-confirms email (no verification step), signUp()
  // immediately creates a session - the proxy will then route this request
  // straight into the app, so the profile row must already exist by the
  // time any (app) page reads it via getProfile()'s .single() call.
  await ensureProfile(supabase, data.user)

  redirect("/login?registered=1")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
