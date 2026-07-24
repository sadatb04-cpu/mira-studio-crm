export const DOCUMENT_TYPES = [
  "invoice",
  "igi_certificate",
  "cad_file",
  "image",
  "shipping_label",
  "manufacturer_payment",
  "employee_information",
  "other",
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Invoice",
  igi_certificate: "IGI Certificate",
  cad_file: "CAD File",
  image: "Image",
  shipping_label: "Shipping Label",
  manufacturer_payment: "Manufacturer Payment",
  employee_information: "Employee Information",
  other: "Other",
}

// Only these three have a relation column on `documents` - no polymorphic
// reference, and no column exists for inventory items, tasks, or
// employees. Do not add entries here without a schema migration.
export const RELATED_RECORD_TYPES = ["order", "customer", "production_job"] as const
export type RelatedRecordType = (typeof RELATED_RECORD_TYPES)[number]

export const RELATED_RECORD_TYPE_LABELS: Record<RelatedRecordType, string> = {
  order: "Order",
  customer: "Customer",
  production_job: "Production Job",
}

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const
export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024

export interface RelatedRecordOption {
  id: string
  label: string
}

export interface FolderOption {
  id: string
  name: string
}

export interface DocumentFolderSummary {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  documentCount: number
  storageBytes: number
}

export interface DocumentFolderFormInput {
  name: string
  description?: string
}

export interface DocumentRelatedRecord {
  type: RelatedRecordType
  id: string
  label: string
}

export interface DocumentListItem {
  id: string
  /** Human-readable label - the primary identifier shown throughout the module (see design goal: read like an operations log, not a file explorer). */
  description: string | null
  /** The original uploaded filename - never overwritten, still shown (in muted text) for downloads/auditing. */
  file_name: string
  document_type: DocumentType
  file_size: number | null
  mime_type: string | null
  created_at: string
  uploadedByName: string | null
  relatedRecord: DocumentRelatedRecord | null
  folder: FolderOption | null
}

export interface DocumentDetail extends DocumentListItem {
  file_url: string
  updated_at: string
  signedUrl: string | null
}

export interface DocumentStats {
  totalDocuments: number
  totalStorageBytes: number
  uploadedThisMonth: number
  recentlyModified: number
}

export interface DocumentFormInput {
  documentType: DocumentType
  description: string
  relatedRecordType?: RelatedRecordType
  relatedRecordId?: string
  folderId?: string
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return "—"

  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
