import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import { DEPARTMENT_LABELS, USER_ROLE_LABELS } from "@/types/profile"
import { EMPLOYMENT_STATUS_LABELS } from "@/types/employee"
import { ACCOUNT_STATUS_LABELS } from "@/types/user-account"
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
  return (
    <SectionCard title="Profile">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {getInitials(employee.full_name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{employee.full_name}</p>
            <p className="text-xs text-muted-foreground">{employee.email ?? "No email on file"}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phone" value={employee.phone ?? "—"} />
          <Field label="Department" value={employee.department ? DEPARTMENT_LABELS[employee.department] : "—"} />
          <Field label="Position" value={employee.position ?? "—"} />
          <Field label="Employment Status" value={EMPLOYMENT_STATUS_LABELS[employee.employment_status]} />
          <Field label="Hire Date" value={formatDate(employee.hire_date)} />
        </dl>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">CRM Access</p>
          {employee.linkedAccount ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Role" value={USER_ROLE_LABELS[employee.linkedAccount.role]} />
              <Field label="Account Status" value={ACCOUNT_STATUS_LABELS[employee.linkedAccount.accountStatus]} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No CRM account linked. Create one from Settings &rarr; Users to grant access.
            </p>
          )}
        </div>
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
