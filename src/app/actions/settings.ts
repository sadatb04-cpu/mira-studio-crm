"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import {
  exportConfigurationJson,
  exportDatabaseSummaryCsv,
  exportSettingsCsv,
  updateBusinessRules as updateBusinessRulesQuery,
  updateCompanyInfo as updateCompanyInfoQuery,
  updateUserPreferences as updateUserPreferencesQuery,
} from "@/lib/supabase/settings"
import { businessRulesSchema, changePasswordSchema, companyInfoSchema, userPreferencesSchema } from "@/lib/validations/settings"
import type { BusinessRulesInput, ChangePasswordInput, CompanyInfoInput, UserPreferencesInput } from "@/lib/validations/settings"

export interface SettingsActionState {
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
    return { error: "Only administrators can modify organization settings." as const, supabase: null }
  }

  return { error: null, supabase }
}

export async function updateCompanyInfo(input: CompanyInfoInput): Promise<SettingsActionState> {
  const validated = companyInfoSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await updateCompanyInfoQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save company information." }
  }

  revalidatePath("/settings")
  return {}
}

export async function updateUserPreferences(input: UserPreferencesInput): Promise<SettingsActionState> {
  const validated = userPreferencesSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await updateUserPreferencesQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save preferences." }
  }

  revalidatePath("/settings")
  return {}
}

export async function updateBusinessRules(input: BusinessRulesInput): Promise<SettingsActionState> {
  const validated = businessRulesSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    await updateBusinessRulesQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save business rules." }
  }

  revalidatePath("/settings")
  return {}
}

export async function changePassword(input: ChangePasswordInput): Promise<SettingsActionState> {
  const validated = changePasswordSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { error } = await supabase.auth.updateUser({ password: validated.data.newPassword })
  if (error) {
    return { error: error.message }
  }

  await supabase.from("activity_logs").insert({
    entity_type: "profile",
    entity_id: user.id,
    action: "password_changed",
    description: "Password changed.",
    actor_id: user.id,
  })

  return {}
}

export interface ExportState {
  error?: string
  content?: string
}

export async function exportDatabaseSummary(): Promise<ExportState> {
  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    return { content: await exportDatabaseSummaryCsv(supabase) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export database summary." }
  }
}

export async function exportSettings(): Promise<ExportState> {
  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    return { content: await exportSettingsCsv(supabase) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export settings." }
  }
}

export async function exportConfiguration(): Promise<ExportState> {
  const { error: authError, supabase } = await requireAdmin()
  if (authError || !supabase) {
    return { error: authError ?? "Unable to verify permissions." }
  }

  try {
    return { content: await exportConfigurationJson(supabase) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to export configuration." }
  }
}
