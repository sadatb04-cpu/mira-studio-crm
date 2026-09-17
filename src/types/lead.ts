export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "lost", "unqualified"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  unqualified: "Unqualified",
}

// No forced progression/stepper - unlike ORDER_WORKFLOW_STAGES, a
// salesperson can set a lead to any status based on the actual
// conversation (e.g. new -> lost directly is valid).
export const LEAD_SOURCES = [
  "instagram",
  "facebook",
  "whatsapp",
  "website",
  "google",
  "referral",
  "email",
  "cold_outreach",
  "import",
  "other",
] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  website: "Website",
  google: "Google",
  referral: "Referral",
  email: "Email",
  cold_outreach: "Cold Outreach",
  import: "Import",
  other: "Other",
}

export const LEAD_PRIORITIES = ["low", "medium", "high"] as const
export type LeadPriority = (typeof LEAD_PRIORITIES)[number]

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

// The Quick Add / list surface for this phase - only the columns those
// views actually render. assigned_to/priority/next_follow_up_at/notes/
// interested_product/requirements_notes exist on the table (see migration
// 0025) but have no UI yet, so they're deliberately left off this list type
// rather than fetched and left unused.
export interface LeadListItem {
  id: string
  full_name: string
  phone: string
  email: string | null
  source: LeadSource | null
  status: LeadStatus
  created_at: string
}
