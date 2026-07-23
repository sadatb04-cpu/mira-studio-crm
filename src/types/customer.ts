import type { OrderStatus } from "@/types/order"

export interface CustomerListItem {
  id: string
  full_name: string
  company_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  is_active: boolean
  created_at: string
  totalOrders: number
  lifetimeSpend: number
  lastOrderDate: string | null
}

export interface CustomerDetail {
  id: string
  full_name: string
  company_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface CustomerOrderSummary {
  id: string
  order_number: string
  status: OrderStatus
  order_date: string
  total: number
  currency: string
}

export interface CustomerStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  firstPurchaseDate: string | null
  latestPurchaseDate: string | null
}

export interface CustomersDashboardStats {
  totalCustomers: number
  activeCustomers: number
  newCustomers30Days: number
  lifetimeRevenue: number
}

export interface CustomerTimelineEvent {
  id: string
  action: string
  description: string | null
  created_at: string
}

export interface CustomerFormInput {
  full_name: string
  email?: string
  phone?: string
  address_line1?: string
  country?: string
  notes?: string
}
