import { format } from "date-fns"
import Link from "next/link"

import { SectionCard } from "@/components/shared/section-card"
import { DocumentTypeBadge } from "@/components/documents/document-type-badge"
import { formatFileSize } from "@/types/document"
import type { DocumentDetail } from "@/types/document"

function relatedRecordHref(relatedRecord: DocumentDetail["relatedRecord"]) {
  if (!relatedRecord) return null
  if (relatedRecord.type === "order") return `/orders/${relatedRecord.id}`
  if (relatedRecord.type === "customer") return `/customers/${relatedRecord.id}`
  return `/production/${relatedRecord.id}`
}

interface DocumentSummaryCardProps {
  document: DocumentDetail
}

export function DocumentSummaryCard({ document }: DocumentSummaryCardProps) {
  const relatedHref = relatedRecordHref(document.relatedRecord)

  return (
    <SectionCard title="Document Information">
      <div className="flex flex-col gap-4">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Description</dt>
          <dd className="text-sm text-foreground">{document.description ?? "No description"}</dd>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Original Filename</dt>
            <dd className="text-sm text-foreground">{document.file_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Type</dt>
            <dd className="text-sm text-foreground">
              <DocumentTypeBadge documentType={document.document_type} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Folder</dt>
            <dd className="text-sm text-foreground">
              {document.folder ? (
                <Link href={`/documents/folders/${document.folder.id}`} className="text-primary hover:underline">
                  {document.folder.name}
                </Link>
              ) : (
                "No Folder"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Related Record</dt>
            <dd className="text-sm text-foreground">
              {relatedHref ? (
                <Link href={relatedHref} className="text-primary hover:underline">
                  {document.relatedRecord?.label}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Uploaded By</dt>
            <dd className="text-sm text-foreground">{document.uploadedByName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Upload Date</dt>
            <dd className="text-sm text-foreground">{format(new Date(document.created_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Size</dt>
            <dd className="text-sm text-foreground">{formatFileSize(document.file_size)}</dd>
          </div>
        </dl>
      </div>
    </SectionCard>
  )
}
