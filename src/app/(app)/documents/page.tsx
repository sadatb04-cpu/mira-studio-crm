import { Files, FileClock, HardDrive, UploadCloud } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { DocumentFilters } from "@/components/documents/document-filters"
import { DocumentTable } from "@/components/documents/document-table"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import { createClient } from "@/lib/supabase/server"
import { getDocuments, getDocumentStats, getRelatedRecordOptions } from "@/lib/supabase/documents"
import { getEmployees } from "@/lib/supabase/production"
import { formatFileSize } from "@/types/document"
import { DOCUMENT_TYPES, RELATED_RECORD_TYPES } from "@/types/document"
import type { DocumentType, RelatedRecordType } from "@/types/document"

interface DocumentsPageProps {
  searchParams: Promise<{
    q?: string
    documentType?: string
    uploadedBy?: string
    relatedType?: string
    uploadedAfter?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const { q, documentType, uploadedBy, relatedType, uploadedAfter } = await searchParams
  const supabase = await createClient()

  const validDocumentType = DOCUMENT_TYPES.includes(documentType as DocumentType)
    ? (documentType as DocumentType)
    : undefined
  const validRelatedType = RELATED_RECORD_TYPES.includes(relatedType as RelatedRecordType)
    ? (relatedType as RelatedRecordType)
    : undefined

  const [documents, stats, employees, orders, customers, productionJobs] = await Promise.all([
    getDocuments(supabase, {
      search: q,
      documentType: validDocumentType,
      uploadedBy,
      relatedType: validRelatedType,
      uploadedAfter,
    }),
    getDocumentStats(supabase),
    getEmployees(supabase),
    getRelatedRecordOptions(supabase, "order"),
    getRelatedRecordOptions(supabase, "customer"),
    getRelatedRecordOptions(supabase, "production_job"),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Documents"
        description="Access official documents, logs, and billing files."
        actions={<DocumentUploadDialog orders={orders} customers={customers} productionJobs={productionJobs} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Documents" value={stats.totalDocuments} icon={Files} />
        <StatCard label="Total Storage Used" value={formatFileSize(stats.totalStorageBytes)} icon={HardDrive} />
        <StatCard label="Uploaded This Month" value={stats.uploadedThisMonth} icon={UploadCloud} />
        <StatCard label="Recently Modified" value={stats.recentlyModified} icon={FileClock} />
      </div>

      <DocumentFilters employees={employees} />

      <DocumentTable documents={documents} />
    </div>
  )
}
