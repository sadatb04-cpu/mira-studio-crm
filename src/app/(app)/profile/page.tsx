import Link from "next/link"
import { redirect } from "next/navigation"
import { KeyRound } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { DEPARTMENT_LABELS, USER_ROLE_LABELS } from "@/types/profile"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)

  const fields: Array<{ label: string; value: string }> = [
    { label: "Full name", value: profile.full_name },
    { label: "Email", value: profile.email },
    { label: "Role", value: USER_ROLE_LABELS[profile.role] },
    { label: "Department", value: profile.department ? DEPARTMENT_LABELS[profile.department] : "Not set" },
    { label: "Phone", value: profile.phone ?? "Not set" },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Profile"
        description="Your account details."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={profile.is_active ? "Active" : "Inactive"} tone={profile.is_active ? "success" : "danger"} />
            <Button asChild size="sm" variant="outline">
              <Link href="/profile/change-password">
                <KeyRound className="size-3.5" data-icon="inline-start" />
                Change Password
              </Link>
            </Button>
          </div>
        }
      />
      <SectionCard>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
              <dd className="text-sm text-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  )
}
