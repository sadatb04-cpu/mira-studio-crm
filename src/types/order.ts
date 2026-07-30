export type OrderStatus =
  | "draft"
  | "pricing_ready"
  | "awaiting_approval"
  | "approved"
  | "confirmed"
  | "in_production"
  | "ready_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "pricing_ready",
  "awaiting_approval",
  "approved",
  "confirmed",
  "in_production",
  "ready_for_delivery",
  "delivered",
  "completed",
  "cancelled",
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  pricing_ready: "Pricing Ready",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  confirmed: "Confirmed",
  in_production: "In Production",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

// The linear sales-review -> production -> delivery lifecycle a new order
// automatically progresses through (Sprint 4.1.3). "confirmed" and
// "completed" are legacy statuses from before this workflow existed - they
// are not part of it, but map to the closest stage below for display so an
// old order with one of those statuses still renders a sensible stepper.
export const ORDER_WORKFLOW_STAGES: OrderStatus[] = [
  "draft",
  "pricing_ready",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_for_delivery",
  "delivered",
]

const LEGACY_STATUS_STAGE_ALIAS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: "approved",
  completed: "delivered",
}

export function getWorkflowStageIndex(status: OrderStatus): number {
  const resolved = LEGACY_STATUS_STAGE_ALIAS[status] ?? status
  return ORDER_WORKFLOW_STAGES.indexOf(resolved)
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

// Migration 0022 - orders-level priority (independent of production_priority/
// task_priority, which apply to production_jobs/tasks respectively).
export const ORDER_PRIORITIES = ["low", "normal", "high", "urgent"] as const
export type OrderPriority = (typeof ORDER_PRIORITIES)[number]

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

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
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

// Order Detail page shows this in place of Company (Sales/CAD/Production/
// Shipping care about where to send the piece, not who bills for it -
// Company remains untouched in the Customers module itself). Returns lines,
// not a single string, so the page can reuse the exact same array for both
// on-screen display and the Copy Address button - display and clipboard
// content can never drift apart.
export function formatDeliveryAddress(customer: {
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}): string[] {
  const cityState = [customer.city, customer.state].filter(Boolean).join(", ")
  const cityStateLine = [cityState, customer.postal_code].filter(Boolean).join(" ")

  return [customer.address_line1, customer.address_line2, cityStateLine, customer.country]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
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

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

// No balanceDue target field - it's a generated column (total - advance_paid,
// migration 0022), the same pattern as Loose Diamonds' selling_price (see
// types/loose-diamond.ts): the import wizard never asks for a raw
// balance-due value, so it can never disagree with total/advance_paid.
export const ORDER_IMPORT_TARGET_FIELDS = [
  "orderNumber",
  "customerName",
  "customerEmail",
  "customerPhone",
  "status",
  "priority",
  "orderDate",
  "dueDate",
  "deliveryDate",
  "salesPerson",
  "metal",
  "metalPurity",
  "diamondType",
  "diamondShape",
  "diamondCarat",
  "ringSize",
  "totalAmount",
  "advancePaid",
  "currency",
  "notes",
] as const
export type OrderImportField = (typeof ORDER_IMPORT_TARGET_FIELDS)[number]

export const ORDER_IMPORT_FIELD_LABELS: Record<OrderImportField, string> = {
  orderNumber: "Order Number",
  customerName: "Customer Name",
  customerEmail: "Customer Email",
  customerPhone: "Customer Phone",
  status: "Status",
  priority: "Priority",
  orderDate: "Order Date",
  dueDate: "Due Date",
  deliveryDate: "Delivery Date",
  salesPerson: "Sales Person",
  metal: "Metal",
  metalPurity: "Metal Purity",
  diamondType: "Diamond Type",
  diamondShape: "Diamond Shape",
  diamondCarat: "Diamond Carat",
  ringSize: "Ring Size",
  totalAmount: "Total Amount",
  advancePaid: "Advance Paid",
  currency: "Currency",
  notes: "Notes",
}

// Order Number and Customer Name are the two fields the brief requires every
// row to have (see order-import-config.ts's parseRow) - everything else is
// optional and either falls back to a sensible default or is simply left
// blank.
export const ORDER_IMPORT_REQUIRED_FIELDS: OrderImportField[] = ["orderNumber", "customerName"]

// Header names the auto-mapper recognizes (lowercased, punctuation-
// insensitive) - see lib/import/column-mapping.ts.
export const ORDER_IMPORT_FIELD_ALIASES: Record<OrderImportField, string[]> = {
  orderNumber: ["order number", "order no", "order #", "order id"],
  customerName: ["customer name", "customer", "client name", "client"],
  customerEmail: ["customer email", "email", "client email"],
  customerPhone: ["customer phone", "phone", "phone number", "client phone", "mobile"],
  status: ["status", "order status"],
  priority: ["priority"],
  orderDate: ["order date", "date"],
  dueDate: ["due date", "deadline"],
  deliveryDate: ["delivery date", "delivered date", "date delivered"],
  salesPerson: ["sales person", "salesperson", "sales rep", "sold by"],
  metal: ["metal"],
  metalPurity: ["metal purity", "purity", "karat", "carat gold"],
  diamondType: ["diamond type", "stone type"],
  diamondShape: ["diamond shape", "stone shape", "shape"],
  diamondCarat: ["diamond carat", "carat", "carat weight", "stone carat"],
  ringSize: ["ring size"],
  totalAmount: ["total amount", "total", "order total", "amount"],
  advancePaid: ["advance paid", "advance", "deposit", "amount paid"],
  currency: ["currency"],
  notes: ["notes", "remarks", "comment", "description"],
}

// Whitelist for the "Invalid currency values" reject rule - deliberately a
// fixed, small set (matching orders.currency's free-text-but-ISO-4217-in-
// practice usage everywhere else in the app) rather than the full ISO-4217
// list, so a typo'd currency reliably gets rejected instead of silently
// accepted as some obscure code.
export const ORDER_IMPORT_ALLOWED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "INR",
  "CAD",
  "AUD",
  "SGD",
  "HKD",
  "CHF",
  "JPY",
  "SAR",
  "QAR",
  "BDT",
] as const

// The shape parseRow (order-import-config.ts) hands the shared import
// engine - already normalized/typed, unlike the raw strings in
// orderImportRowSchema.
export interface OrderImportInput {
  orderNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  status: OrderStatus
  priority: OrderPriority
  orderDate?: string
  dueDate?: string
  deliveryDate?: string
  salesPerson?: string
  metal?: string
  metalPurity?: string
  diamondType?: StoneType
  diamondShape?: StoneShape
  diamondCarat?: number
  ringSize?: string
  totalAmount: number
  advancePaid: number
  currency: string
  notes?: string
}
