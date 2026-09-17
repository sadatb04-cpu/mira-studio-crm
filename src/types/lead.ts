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

// ---------------------------------------------------------------------------
// Bulk import - reuses the same generalized ImportWizardConfig every other
// category (Loose Diamonds, Jewelry, Orders) already uses. Mirrors Orders'
// ORDER_IMPORT_* shape exactly, including the camelCase field names (import
// input shapes use camelCase everywhere in this app; only the Quick Add/
// Supabase-column-matching CreateLeadInput uses snake_case).
//
// Deliberately only the same 5 fields Quick Add collects - no
// interested_product/requirements_notes/status/priority target field exists
// here, so an imported spreadsheet can never set qualification data or
// override status/priority even if a column happens to be named that.
// ---------------------------------------------------------------------------

export const LEAD_IMPORT_TARGET_FIELDS = ["fullName", "phone", "email", "source", "notes"] as const
export type LeadImportField = (typeof LEAD_IMPORT_TARGET_FIELDS)[number]

export const LEAD_IMPORT_FIELD_LABELS: Record<LeadImportField, string> = {
  fullName: "Name",
  phone: "Phone / WhatsApp",
  email: "Email",
  source: "Source",
  notes: "Notes",
}

export const LEAD_IMPORT_REQUIRED_FIELDS: LeadImportField[] = ["fullName", "phone"]

// Header names the auto-mapper recognizes (lowercased, punctuation-
// insensitive - see lib/import/column-mapping.ts), per the approved column
// list.
export const LEAD_IMPORT_FIELD_ALIASES: Record<LeadImportField, string[]> = {
  fullName: ["name", "full name", "customer name", "lead name"],
  phone: ["phone", "phone number", "mobile", "mobile number", "whatsapp", "whatsapp number"],
  email: ["email", "email address", "e mail"],
  source: ["source", "lead source"],
  notes: ["notes", "comments", "remarks", "requirements"],
}

export interface LeadImportInput {
  fullName: string
  phone: string
  email?: string
  source?: LeadSource
  notes?: string
}
