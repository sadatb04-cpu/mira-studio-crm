import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { DEFAULT_BRANDING } from "@/types/branding"
import type { BrandingSettings } from "@/types/branding"
import { SETTINGS_KEYS } from "@/types/settings"
import type { BrandingTextInput } from "@/lib/validations/branding"
import type { Json } from "@/types/database"

const LOGO_BUCKET = "branding"

// Callable unauthenticated (root layout, login page) - the `branding` key
// has its own public-read RLS policy, unlike every other settings key.
export async function getBrandingSettings(supabase: SupabaseClient): Promise<BrandingSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", SETTINGS_KEYS.branding)
    .maybeSingle()

  if (error) throw error

  return { ...DEFAULT_BRANDING, ...(data?.value as Partial<BrandingSettings> | undefined) }
}

// React's cache() memoizes per-request, keyed on the (zero) arguments - so
// generateMetadata() and RootLayout() both calling this within the same
// request only hit the database once, per the "avoid duplicate fetching"
// requirement. Only for the anonymous, root-layout read path; the settings
// page uses getBrandingSettings() directly with its own client so it always
// sees a fresh value right after a save.
export const getCachedBranding = cache(async (): Promise<BrandingSettings> => {
  const supabase = await createClient()
  return getBrandingSettings(supabase)
})

async function upsertBranding(supabase: SupabaseClient, value: BrandingSettings, updatedBy: string | null): Promise<string> {
  const { data, error } = await supabase
    .from("settings")
    .upsert(
      {
        key: SETTINGS_KEYS.branding,
        value: value as unknown as Json,
        description: "Application branding: logo, application name, and company name.",
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select("id")
    .single()

  if (error) throw error
  return data.id as string
}

// Best-effort only, matching the non-throwing activity logging pattern
// used throughout the app (see settings.ts's logActivity).
async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "setting",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function updateBrandingText(supabase: SupabaseClient, input: BrandingTextInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const current = await getBrandingSettings(supabase)
  const id = await upsertBranding(supabase, { ...current, ...input }, user?.id ?? null)
  await logActivity(supabase, { entity_id: id, action: "branding_updated", description: "Application/company name updated." })
}

interface LogoUpdate {
  logoUrl: string
  logoPath: string
}

// Only one active logo: if a previous object exists at a different path,
// remove it after the new one is safely recorded so a mid-failure never
// leaves the settings row pointing at a deleted file.
export async function updateBrandingLogo(supabase: SupabaseClient, input: LogoUpdate): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const current = await getBrandingSettings(supabase)
  const id = await upsertBranding(supabase, { ...current, logoUrl: input.logoUrl, logoPath: input.logoPath }, user?.id ?? null)

  if (current.logoPath && current.logoPath !== input.logoPath) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])
  }

  await logActivity(supabase, { entity_id: id, action: "logo_updated", description: "Company logo uploaded." })
}

export async function removeBrandingLogo(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const current = await getBrandingSettings(supabase)
  const id = await upsertBranding(supabase, { ...current, logoUrl: null, logoPath: null }, user?.id ?? null)

  if (current.logoPath) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])
  }

  await logActivity(supabase, { entity_id: id, action: "logo_removed", description: "Company logo removed." })
}
