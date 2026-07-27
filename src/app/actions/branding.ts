"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import {
  removeBrandingLogo as removeBrandingLogoQuery,
  updateBrandingLogo as updateBrandingLogoQuery,
  updateBrandingText as updateBrandingTextQuery,
} from "@/lib/supabase/branding"
import { brandingTextSchema } from "@/lib/validations/branding"
import type { BrandingTextInput } from "@/lib/validations/branding"

export interface BrandingActionState {
  error?: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." as const, supabase: null }
  }

  const profile = await getProfile(supabase, user.id)
  if (profile.role !== "admin") {
    return { error: "Only administrators can modify branding." as const, supabase: null }
  }

  return { error: null, supabase }
}

// Branding affects the root layout (title, favicon, sidebar, login page),
// not just the settings page it's edited from - revalidate the whole tree.
function revalidateBranding() {
  revalidatePath("/", "layout")
}

export async function updateBranding(input: BrandingTextInput): Promise<BrandingActionState> {
  const validated = brandingTextSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await updateBrandingTextQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save branding." }
  }

  revalidateBranding()
  return {}
}

export async function updateBrandingLogo(input: { logoUrl: string; logoPath: string }): Promise<BrandingActionState> {
  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await updateBrandingLogoQuery(supabase, input)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save the logo." }
  }

  revalidateBranding()
  return {}
}

export async function removeBrandingLogo(): Promise<BrandingActionState> {
  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await removeBrandingLogoQuery(supabase)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to remove the logo." }
  }

  revalidateBranding()
  return {}
}
