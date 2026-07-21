export type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_production"
  | "ready_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "confirmed",
  "in_production",
  "ready_for_delivery",
  "delivered",
  "completed",
  "cancelled",
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  in_production: "In Production",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

export interface OrderListItem {
  id: string
  order_number: string
  status: OrderStatus
  order_date: string
  due_date: string | null
  total: number
  currency: string
  created_at: string
  customer: { full_name: string } | null
  order_items: { count: number }[]
}

export type OrderStatusCounts = Record<OrderStatus, number>
