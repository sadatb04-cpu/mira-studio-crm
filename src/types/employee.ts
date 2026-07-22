import type { Department, UserRole } from "@/types/profile"
import type { ProductionJobStatus } from "@/types/production"
import type { TaskStatus } from "@/types/task"

export const EMPLOYMENT_STATUSES = ["active", "on_leave", "terminated"] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  terminated: "Terminated",
}

export interface EmployeeProfileSummary {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  department: Department | null
  avatar_url: string | null
}

export interface EmployeeListItem {
  id: string
  position: string | null
  hire_date: string | null
  employment_status: EmploymentStatus
  profile: EmployeeProfileSummary
}

export interface EmployeeDetail extends EmployeeListItem {
  termination_date: string | null
  created_at: string
}

export interface EmployeeAssignedJob {
  id: string
  job_number: string
  status: ProductionJobStatus
}

export interface EmployeeAssignedTask {
  id: string
  title: string
  status: TaskStatus
}

export interface EmployeeAssignments {
  productionJobs: EmployeeAssignedJob[]
  tasks: EmployeeAssignedTask[]
}

export interface EmployeeDashboardStats {
  total: number
  active: number
  onLeave: number
  terminated: number
  newHires30Days: number
}

export interface EmployeeTimelineEvent {
  id: string
  action: string
  description: string | null
  created_at: string
}

export interface EmployeeFormInput {
  full_name: string
  email: string
  phone?: string
  department?: Department
  role: UserRole
  position: string
  employment_status: EmploymentStatus
  hire_date: string
}

export interface AvailableProfileOption {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  department: Department | null
}
