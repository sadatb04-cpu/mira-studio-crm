"use client"

import { useState, useTransition } from "react"
import { Download, File, FileImage, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { DocumentTypeBadge } from "@/components/documents/document-type-badge"
import { downloadDocument } from "@/app/actions/documents"
import { formatFileSize } from "@/types/document"
import type { DocumentListItem } from "@/types/document"

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) return <FileImage className="size-4 text-muted-foreground" />
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel"))
    return <FileSpreadsheet className="size-4 text-muted-foreground" />
  if (mimeType === "application/pdf" || mimeType?.includes("word"))
    return <FileText className="size-4 text-muted-foreground" />
  return <File className="size-4 text-muted-foreground" />
}

function relatedRecordHref(relatedRecord: DocumentListItem["relatedRecord"]) {
  if (!relatedRecord) return null
  if (relatedRecord.type === "order") return `/orders/${relatedRecord.id}`
  if (relatedRecord.type === "customer") return `/customers/${relatedRecord.id}`
  return `/production/${relatedRecord.id}`
}

interface DocumentTableProps {
  documents: DocumentListItem[]
}

export function DocumentTable({ documents }: DocumentTableProps) {
  const router = useRouter()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDownload(id: string) {
    setDownloadingId(id)
    startTransition(async () => {
      const result = await downloadDocument(id)
      setDownloadingId(null)
      if (result.signedUrl) {
        window.open(result.signedUrl, "_blank", "noopener,noreferrer")
      }
    })
  }

  if (documents.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={File}
          title="No documents found"
          description="Try adjusting your search or filters, or upload a new document."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Folder</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Related Record</th>
            <th className="px-4 py-2">Uploaded By</th>
            <th className="px-4 py-2">Size</th>
            <th className="px-4 py-2">Uploaded</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const relatedHref = relatedRecordHref(document.relatedRecord)
            return (
              <tr
                key={document.id}
                onClick={() => router.push(`/documents/${document.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/documents/${document.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="flex items-start gap-2 hover:underline"
                  >
                    <FileIcon mimeType={document.mime_type} />
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">{document.description ?? "No description"}</span>
                      <span className="text-xs text-muted-foreground">{document.file_name}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {document.folder ? (
                    <Link
                      href={`/documents/folders/${document.folder.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {document.folder.name}
                    </Link>
                  ) : (
                    "No Folder"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <DocumentTypeBadge documentType={document.document_type} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {relatedHref ? (
                    <Link
                      href={relatedHref}
                      onClick={(event) => event.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {document.relatedRecord?.label}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{document.uploadedByName ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatFileSize(document.file_size)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {format(new Date(document.created_at), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending && downloadingId === document.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDownload(document.id)
                    }}
                    aria-label="Download document"
                  >
                    {isPending && downloadingId === document.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </SectionCard>
  )
}
