import Link from "next/link"
import { ShieldCheck, Users } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { CompanySettingsCard } from "@/components/settings/company-settings-card"
import { PreferenceSettingsCard } from "@/components/settings/preference-settings-card"
import { BusinessRulesCard } from "@/components/settings/business-rules-card"
import { SecuritySettingsCard } from "@/components/settings/security-settings-card"
import { AppearanceCard } from "@/components/settings/appearance-card"
import { BackupExportCard } from "@/components/settings/backup-export-card"
import { AboutCard } from "@/components/settings/about-card"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { getSettingsBundle } from "@/lib/supabase/settings"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)

  // The settings table's RLS restricts every operation (including SELECT) to
  // the admin role, by design - a non-admin session cannot read these rows,
  // so this page (and its nav item) is admin-only rather than showing a
  // partially-broken read-only view.
  if (profile.role !== "admin") {
    notFound()
  }

  const settings = await getSettingsBundle(supabase)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Settings"
        description="Configure system options, integration endpoints, and parameters."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/users">
                <Users className="size-3.5" data-icon="inline-start" />
                Manage Users
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/permissions">
                <ShieldCheck className="size-3.5" data-icon="inline-start" />
                User Access
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CompanySettingsCard companyInfo={settings.companyInfo} />
        <PreferenceSettingsCard preferences={settings.userPreferences} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BusinessRulesCard businessRules={settings.businessRules} />
        <SecuritySettingsCard profile={profile} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppearanceCard />
        <BackupExportCard />
      </div>

      <AboutCard lastUpdated={settings.lastUpdated} lastUpdatedByName={settings.lastUpdatedByName} />
    </div>
  )
}
