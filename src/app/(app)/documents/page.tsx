import { FolderPlus, Files, FileClock, HardDrive, UploadCloud } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { DocumentFilters } from "@/components/documents/document-filters"
import { DocumentTable } from "@/components/documents/document-table"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import { FolderFormDialog } from "@/components/documents/folder-form-dialog"
import { FolderCard } from "@/components/documents/folder-card"
import { FolderSearchBar } from "@/components/documents/folder-search-bar"
import { PermissionGate } from "@/components/providers/permission-gate"
import { createClient } from "@/lib/supabase/server"
import { getDocuments, getDocumentStats, getRelatedRecordOptions } from "@/lib/supabase/documents"
import { getDocumentFolders } from "@/lib/supabase/document-folders"
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
    folderQuery?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const { q, documentType, uploadedBy, relatedType, uploadedAfter, folderQuery } = await searchParams
  const supabase = await createClient()

  const validDocumentType = DOCUMENT_TYPES.includes(documentType as DocumentType)
    ? (documentType as DocumentType)
    : undefined
  const validRelatedType = RELATED_RECORD_TYPES.includes(relatedType as RelatedRecordType)
    ? (relatedType as RelatedRecordType)
    : undefined

  const [ungroupedDocuments, stats, employees, orders, customers, productionJobs, allFolders] = await Promise.all([
    getDocuments(supabase, {
      onlyUngrouped: true,
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
    getDocumentFolders(supabase),
  ])

  const folders = folderQuery
    ? allFolders.filter((folder) => folder.name.toLowerCase().includes(folderQuery.toLowerCase()))
    : allFolders

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Documents"
        description="Access official documents, logs, and billing files."
        actions={
          <PermissionGate module="documents" action="create">
            <div className="flex items-center gap-2">
              <FolderFormDialog mode="create" />
              <DocumentUploadDialog orders={orders} customers={customers} productionJobs={productionJobs} folders={allFolders} />
            </div>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Documents" value={stats.totalDocuments} icon={Files} />
        <StatCard label="Total Storage Used" value={formatFileSize(stats.totalStorageBytes)} icon={HardDrive} />
        <StatCard label="Uploaded This Month" value={stats.uploadedThisMonth} icon={UploadCloud} />
        <StatCard label="Recently Modified" value={stats.recentlyModified} icon={FileClock} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">Folders</h2>
          <FolderSearchBar />
        </div>

        {allFolders.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="No folders yet"
            description="Create a folder to start organizing documents by department, purpose, or record type."
          />
        ) : folders.length === 0 ? (
          <EmptyState icon={FolderPlus} title="No folders match your search" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Ungrouped Documents</h2>
        <DocumentFilters employees={employees} />
        <DocumentTable documents={ungroupedDocuments} />
      </div>
    </div>
  )
}
