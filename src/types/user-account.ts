import type { Department, UserRole } from "@/types/profile"

export const ACCOUNT_STATUSES = ["active", "suspended", "disabled", "pending_invite"] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  disabled: "Disabled",
  pending_invite: "Pending Invite",
}

export interface UserAccountListItem {
  id: string
  full_name: string
  email: string
  role: UserRole
  department: Department | null
  accountStatus: AccountStatus
  createdAt: string
  linkedEmployee: { id: string; full_name: string } | null
}

export interface UnlinkedEmployeeOption {
  id: string
  full_name: string
  email: string | null
}

export interface CreateUserAccountInput {
  fullName: string
  email: string
  password: string
  role: UserRole
  department?: Department
  employeeId?: string
}
