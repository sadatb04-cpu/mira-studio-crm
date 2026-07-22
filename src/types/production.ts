import type { OrderItemSpecifications } from "@/types/order"

export type ProductionJobStatus =
  | "queued"
  | "in_progress"
  | "quality_check"
  | "rework"
  | "completed"
  | "on_hold"
  | "cancelled"

export const PRODUCTION_JOB_STATUSES: ProductionJobStatus[] = [
  "queued",
  "in_progress",
  "quality_check",
  "rework",
  "completed",
  "on_hold",
  "cancelled",
]

// "completed" is surfaced to users as "Ready" everywhere, matching the
// stepper's terminology (Sprint 4.3 workflow).
export const PRODUCTION_JOB_STATUS_LABELS: Record<ProductionJobStatus, string> = {
  queued: "Queued",
  in_progress: "In Production",
  quality_check: "Quality Check",
  rework: "Rework",
  completed: "Ready",
  on_hold: "On Hold",
  cancelled: "Cancelled",
}

export type ProductionPriority = "low" | "normal" | "high" | "urgent"

export const PRODUCTION_PRIORITIES: ProductionPriority[] = ["low", "normal", "high", "urgent"]

export const PRODUCTION_PRIORITY_LABELS: Record<ProductionPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

export type ProductionStageName =
  | "design"
  | "wax_carving"
  | "casting"
  | "stone_setting"
  | "polishing"
  | "quality_check"
  | "engraving"
  | "packaging"
  | "shipping"

export type ProductionStageStatus = "pending" | "in_progress" | "completed" | "skipped"

// The 4 stages every production job gets on creation, in order.
export const STAGE_SEQUENCE: ProductionStageName[] = ["casting", "stone_setting", "polishing", "quality_check"]

export const STAGE_LABELS: Partial<Record<ProductionStageName, string>> = {
  casting: "Casting",
  stone_setting: "Stone Setting",
  polishing: "Polishing",
  quality_check: "Quality Check",
}

export interface ProductionStageDetail {
  id: string
  stage_name: ProductionStageName
  sequence: number
  status: ProductionStageStatus
  started_at: string | null
  completed_at: string | null
}

export interface EmployeeOption {
  id: string
  full_name: string
  email: string | null
}

export interface ProductionOrderItemSummary {
  id: string
  description: string
  order: {
    id: string
    order_number: string
    customer: { full_name: string } | null
  } | null
}

export interface ProductionJobListItem {
  id: string
  job_number: string
  status: ProductionJobStatus
  priority: ProductionPriority
  due_date: string | null
  created_at: string
  assigned_employee: { full_name: string } | null
  order_item: ProductionOrderItemSummary | null
}

export interface ProductionJobDetail {
  id: string
  job_number: string
  status: ProductionJobStatus
  priority: ProductionPriority
  due_date: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  assigned_employee: EmployeeOption | null
  order_item: {
    id: string
    description: string
    specifications: OrderItemSpecifications
    quantity: number
    unit_price: number
    order: {
      id: string
      order_number: string
      customer: { id: string; full_name: string; email: string | null; phone: string | null } | null
    }
  }
  stages: ProductionStageDetail[]
}

export interface ProductionKpis {
  total: number
  inProduction: number
  qualityCheck: number
  ready: number
  overdue: number
}

export interface TimelineEvent {
  id: string
  action: string
  description: string | null
  created_at: string
  actor_id: string | null
}
