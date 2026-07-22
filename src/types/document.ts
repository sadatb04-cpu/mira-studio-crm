export const DOCUMENT_TYPES = [
  "invoice",
  "igi_certificate",
  "cad_file",
  "image",
  "shipping_label",
  "other",
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Invoice",
  igi_certificate: "IGI Certificate",
  cad_file: "CAD File",
  image: "Image",
  shipping_label: "Shipping Label",
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

export interface DocumentRelatedRecord {
  type: RelatedRecordType
  id: string
  label: string
}

export interface DocumentListItem {
  id: string
  file_name: string
  document_type: DocumentType
  file_size: number | null
  mime_type: string | null
  created_at: string
  uploadedByName: string | null
  relatedRecord: DocumentRelatedRecord | null
}

export interface DocumentDetail extends DocumentListItem {
  file_url: string
  notes: string | null
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
  notes?: string
  relatedRecordType?: RelatedRecordType
  relatedRecordId?: string
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
