import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronRight, Files, FolderOpen, HardDrive } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { DocumentFilters } from "@/components/documents/document-filters"
import { DocumentTable } from "@/components/documents/document-table"
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog"
import { FolderActions } from "@/components/documents/folder-actions"
import { createClient } from "@/lib/supabase/server"
import { getDocuments, getRelatedRecordOptions } from "@/lib/supabase/documents"
import { getDocumentFolder, getFolderOptions } from "@/lib/supabase/document-folders"
import { getEmployees } from "@/lib/supabase/production"
import { formatFileSize } from "@/types/document"
import { DOCUMENT_TYPES, RELATED_RECORD_TYPES } from "@/types/document"
import type { DocumentType, RelatedRecordType } from "@/types/document"

interface FolderDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    q?: string
    documentType?: string
    uploadedBy?: string
    relatedType?: string
    uploadedAfter?: string
  }>
}

export default async function FolderDetailPage({ params, searchParams }: FolderDetailPageProps) {
  const { id } = await params
  const { q, documentType, uploadedBy, relatedType, uploadedAfter } = await searchParams
  const supabase = await createClient()

  const folder = await getDocumentFolder(supabase, id)
  if (!folder) {
    notFound()
  }

  const validDocumentType = DOCUMENT_TYPES.includes(documentType as DocumentType)
    ? (documentType as DocumentType)
    : undefined
  const validRelatedType = RELATED_RECORD_TYPES.includes(relatedType as RelatedRecordType)
    ? (relatedType as RelatedRecordType)
    : undefined

  const [documents, employees, orders, customers, productionJobs, folders] = await Promise.all([
    getDocuments(supabase, {
      folderId: id,
      search: q,
      documentType: validDocumentType,
      uploadedBy,
      relatedType: validRelatedType,
      uploadedAfter,
    }),
    getEmployees(supabase),
    getRelatedRecordOptions(supabase, "order"),
    getRelatedRecordOptions(supabase, "customer"),
    getRelatedRecordOptions(supabase, "production_job"),
    getFolderOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/documents"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to Documents
        </Link>

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/documents" className="hover:text-foreground hover:underline">
            Documents
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{folder.name}</span>
        </nav>
      </div>

      <PageHeader
        title={folder.name}
        description={folder.description ?? "No description"}
        actions={
          <div className="flex items-center gap-2">
            <FolderActions folderId={folder.id} folderName={folder.name} folderDescription={folder.description} />
            <DocumentUploadDialog
              orders={orders}
              customers={customers}
              productionJobs={productionJobs}
              folders={folders}
              defaultFolderId={folder.id}
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Documents" value={folder.documentCount} icon={Files} />
        <StatCard label="Storage Used" value={formatFileSize(folder.storageBytes)} icon={HardDrive} />
      </div>

      {folder.documentCount === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents in this folder yet."
          action={
            <DocumentUploadDialog
              orders={orders}
              customers={customers}
              productionJobs={productionJobs}
              folders={folders}
              defaultFolderId={folder.id}
            />
          }
        />
      ) : (
        <>
          <DocumentFilters employees={employees} />
          <DocumentTable documents={documents} />
        </>
      )}
    </div>
  )
}
