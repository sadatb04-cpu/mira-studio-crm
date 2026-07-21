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

export const JEWELRY_TYPES = [
  "Ring",
  "Necklace",
  "Bracelet",
  "Earrings",
  "Pendant",
  "Bangle",
  "Anklet",
  "Brooch",
  "Cufflinks",
  "Other",
] as const
export type JewelryType = (typeof JEWELRY_TYPES)[number]

export const METALS = ["Gold", "White Gold", "Rose Gold", "Platinum", "Silver", "Palladium", "Titanium"] as const
export type Metal = (typeof METALS)[number]

export const METAL_PURITIES = ["24k", "22k", "18k", "14k", "10k", "950 Platinum", "925 Silver"] as const
export type MetalPurity = (typeof METAL_PURITIES)[number]

export const STONE_TYPES = [
  "Diamond",
  "Sapphire",
  "Ruby",
  "Emerald",
  "Pearl",
  "Amethyst",
  "Topaz",
  "Aquamarine",
  "Other",
  "None",
] as const
export type StoneType = (typeof STONE_TYPES)[number]

export const STONE_SHAPES = [
  "Round",
  "Princess",
  "Cushion",
  "Oval",
  "Emerald",
  "Pear",
  "Marquise",
  "Radiant",
  "Asscher",
  "Heart",
  "N/A",
] as const
export type StoneShape = (typeof STONE_SHAPES)[number]

export interface OrderItemSpecifications {
  jewelry_type?: string
  metal?: string
  metal_purity?: string
  stone_type?: string
  stone_shape?: string
  stone_size?: string
  ring_size?: string
  engraving?: string
}

export interface OrderItemDetail {
  id: string
  description: string
  specifications: OrderItemSpecifications
  quantity: number
  unit_price: number
  total_price: number | null
}

export interface CustomerOption {
  id: string
  full_name: string
  company_name: string | null
  email: string | null
}

export interface OrderDetailCustomer {
  id: string
  full_name: string
  company_name: string | null
  email: string | null
  phone: string | null
}

export interface OrderDetail {
  id: string
  order_number: string
  status: OrderStatus
  order_date: string
  due_date: string | null
  notes: string | null
  subtotal: number
  tax: number
  shipping_cost: number
  total: number
  currency: string
  created_at: string
  customer: OrderDetailCustomer | null
  order_items: OrderItemDetail[]
}
