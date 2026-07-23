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
  order_stones: { count: number }[]
}

export type OrderStatusCounts = Record<OrderStatus, number>

// Stone type/shape back the order_stones table (Sprint 4.1.1). The order
// creation/edit form no longer collects them directly (Sprint "Simplify
// Order Creation") - order_stones is populated later by Sales/CAD/Production
// - but the table and these types stay, and getOrderById() still reads them.
export const STONE_TYPES = [
  "lab_diamond",
  "natural_diamond",
  "emerald",
  "ruby",
  "sapphire",
  "moissanite",
  "pearl",
  "other",
] as const
export type StoneType = (typeof STONE_TYPES)[number]

export const STONE_TYPE_LABELS: Record<StoneType, string> = {
  lab_diamond: "Lab Diamond",
  natural_diamond: "Natural Diamond",
  emerald: "Emerald",
  ruby: "Ruby",
  sapphire: "Sapphire",
  moissanite: "Moissanite",
  pearl: "Pearl",
  other: "Other",
}

export const STONE_SHAPES = [
  "round",
  "oval",
  "princess",
  "cushion",
  "emerald",
  "pear",
  "marquise",
  "radiant",
  "asscher",
  "heart",
  "trillion",
  "baguette",
  "old_mine",
  "old_european",
  "other",
] as const
export type StoneShape = (typeof STONE_SHAPES)[number]

export const STONE_SHAPE_LABELS: Record<StoneShape, string> = {
  round: "Round",
  oval: "Oval",
  princess: "Princess",
  cushion: "Cushion",
  emerald: "Emerald",
  pear: "Pear",
  marquise: "Marquise",
  radiant: "Radiant",
  asscher: "Asscher",
  heart: "Heart",
  trillion: "Trillion",
  baguette: "Baguette",
  old_mine: "Old Mine",
  old_european: "Old European",
  other: "Other",
}

export interface OrderStone {
  id: string
  stone_type: StoneType
  shape: StoneShape
  quantity: number
  mm_size: string
  carat_weight: number
  color: string | null
  clarity: string | null
  notes: string | null
}

export const ALLOWED_ORDER_FILE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const
export type AllowedOrderFileMimeType = (typeof ALLOWED_ORDER_FILE_MIME_TYPES)[number]

export const MAX_ORDER_FILE_SIZE_BYTES = 25 * 1024 * 1024

export interface OrderFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  uploadedByName: string | null
  created_at: string
  signedUrl: string | null
}

// Legacy fields from pre-simplification order forms (Sprint 4.1 and Sprint
// 4.1.1) - no longer written by the current form, kept only so older orders'
// stored specifications still type correctly when read.
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

export interface OrderTimelineEvent {
  id: string
  action: string
  description: string | null
  created_at: string
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
  customer_id: string
  /** The order's single product (first order_item's description) - the simplified form's "Product Name". */
  productName: string
  order_items: OrderItemDetail[]
  stones: OrderStone[]
  files: OrderFile[]
}
