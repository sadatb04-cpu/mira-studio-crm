export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected"] as const
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
}

export interface QuotationCostBreakdown {
  metal_cost: number
  stone_cost: number
  labor_cost: number
  cad_cost: number
  setting_cost: number
  certification_cost: number
  hallmark_cost: number
  packaging_cost: number
  shipping_cost: number
  other_charges: number
  discount: number
}

// Order matches the sprint's field list exactly - discount is handled
// separately wherever this is rendered, since it subtracts rather than adds.
export const QUOTATION_COST_FIELDS: { key: keyof QuotationCostBreakdown; label: string }[] = [
  { key: "metal_cost", label: "Metal Cost" },
  { key: "stone_cost", label: "Stone Cost" },
  { key: "labor_cost", label: "Labor Cost" },
  { key: "cad_cost", label: "CAD Cost" },
  { key: "setting_cost", label: "Setting Cost" },
  { key: "certification_cost", label: "Certification Cost" },
  { key: "hallmark_cost", label: "Hallmark Cost" },
  { key: "packaging_cost", label: "Packaging" },
  { key: "shipping_cost", label: "Shipping" },
  { key: "other_charges", label: "Other Charges" },
]

export interface Quotation extends QuotationCostBreakdown {
  id: string
  order_id: string
  quote_name: string
  status: QuotationStatus
  /** Generated column (all costs summed, minus discount) - never written to directly. */
  grand_total: number
  notes: string | null
  created_at: string
  updated_at: string
}
