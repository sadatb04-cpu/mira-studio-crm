import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import { DEPARTMENT_LABELS, USER_ROLE_LABELS } from "@/types/profile"
import { EMPLOYMENT_STATUS_LABELS } from "@/types/employee"
import type { EmployeeDetail } from "@/types/employee"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "Not set"
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

interface EmployeeSummaryCardProps {
  employee: EmployeeDetail
}

export function EmployeeSummaryCard({ employee }: EmployeeSummaryCardProps) {
  const { profile } = employee

  return (
    <SectionCard title="Profile">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {getInitials(profile.full_name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phone" value={profile.phone ?? "—"} />
          <Field label="Role" value={USER_ROLE_LABELS[profile.role]} />
          <Field label="Department" value={profile.department ? DEPARTMENT_LABELS[profile.department] : "—"} />
          <Field label="Position" value={employee.position ?? "—"} />
          <Field label="Employment Status" value={EMPLOYMENT_STATUS_LABELS[employee.employment_status]} />
          <Field label="Hire Date" value={formatDate(employee.hire_date)} />
        </dl>
      </div>
    </SectionCard>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
