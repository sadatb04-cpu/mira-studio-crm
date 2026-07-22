export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
}

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export interface TaskAssigneeSummary {
  id: string
  full_name: string
}

export interface TaskOrderSummary {
  id: string
  order_number: string
}

export interface TaskProductionJobSummary {
  id: string
  job_number: string
}

export interface TaskListItem {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string
  assigned_employee: TaskAssigneeSummary | null
  order: TaskOrderSummary | null
}

export interface TaskDetail {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_at: string
  assigned_employee: TaskAssigneeSummary | null
  order: TaskOrderSummary | null
  production_job: TaskProductionJobSummary | null
}

export interface TaskDashboardStats {
  total: number
  todo: number
  inProgress: number
  completed: number
  overdue: number
}

export interface TaskTimelineEvent {
  id: string
  action: string
  description: string | null
  created_at: string
}

export interface TaskFormInput {
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string
  assigned_to?: string
  order_id?: string
  production_job_id?: string
}

export interface OrderOption {
  id: string
  order_number: string
}

export interface ProductionJobOption {
  id: string
  job_number: string
}
