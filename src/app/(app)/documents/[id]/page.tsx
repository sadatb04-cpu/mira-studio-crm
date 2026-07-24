import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { DocumentTypeBadge } from "@/components/documents/document-type-badge"
import { DocumentSummaryCard } from "@/components/documents/document-summary-card"
import { DocumentPreview } from "@/components/documents/document-preview"
import { DocumentActions } from "@/components/documents/document-actions"
import { createClient } from "@/lib/supabase/server"
import { getDocument } from "@/lib/supabase/documents"
import { getFolderOptions } from "@/lib/supabase/document-folders"

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const document = await getDocument(supabase, id)

  if (!document) {
    notFound()
  }

  const folders = await getFolderOptions(supabase)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={document.description ?? "No description"}
        description={document.file_name}
        actions={
          <div className="flex items-center gap-3">
            <DocumentTypeBadge documentType={document.document_type} />
            <DocumentActions
              documentId={document.id}
              fileName={document.file_name}
              currentFolderId={document.folder?.id ?? null}
              folders={folders}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DocumentSummaryCard document={document} />
        <DocumentPreview document={document} />
      </div>
    </div>
  )
}
