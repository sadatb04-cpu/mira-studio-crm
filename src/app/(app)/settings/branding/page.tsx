import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { BrandingLogoCard } from "@/components/settings/branding-logo-card"
import { BrandingTextCard } from "@/components/settings/branding-text-card"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { getBrandingSettings } from "@/lib/supabase/branding"
import { getSettingsBundle } from "@/lib/supabase/settings"

export default async function BrandingSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)

  // Same admin-only gate as the parent /settings page (the `settings`
  // table's RLS restricts writes to admins - a non-admin can't save here).
  if (profile.role !== "admin") {
    notFound()
  }

  const [branding, settings] = await Promise.all([getBrandingSettings(supabase), getSettingsBundle(supabase)])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link
        href="/settings"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Back to Settings
      </Link>

      <PageHeader
        title="Branding"
        description="Control the logo, application name, and company name used across the CRM, login page, and exports."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BrandingLogoCard branding={branding} />
        <BrandingTextCard branding={branding} fallbackCompanyName={settings.companyInfo.name} />
      </div>
    </div>
  )
}
