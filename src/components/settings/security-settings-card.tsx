import { SectionCard } from "@/components/shared/section-card"
import { DEPARTMENT_LABELS, USER_ROLE_LABELS } from "@/types/profile"
import type { Profile } from "@/types/profile"

interface SecuritySettingsCardProps {
  profile: Profile
}

export function SecuritySettingsCard({ profile }: SecuritySettingsCardProps) {
  return (
    <SectionCard title="Security" description="Your account. Manage your password from My Profile in the top-right menu.">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Current User</dt>
          <dd className="text-sm text-foreground">{profile.full_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Email</dt>
          <dd className="text-sm text-foreground">{profile.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Role</dt>
          <dd className="text-sm text-foreground">{USER_ROLE_LABELS[profile.role]}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Department</dt>
          <dd className="text-sm text-foreground">{profile.department ? DEPARTMENT_LABELS[profile.department] : "Not set"}</dd>
        </div>
      </dl>
    </SectionCard>
  )
}
