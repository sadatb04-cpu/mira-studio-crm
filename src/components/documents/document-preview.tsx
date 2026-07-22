import { FileText } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import type { DocumentDetail } from "@/types/document"

interface DocumentPreviewProps {
  document: DocumentDetail
}

export function DocumentPreview({ document }: DocumentPreviewProps) {
  if (!document.signedUrl) {
    return (
      <SectionCard title="Preview">
        <p className="text-sm text-muted-foreground">Preview is unavailable for this file right now.</p>
      </SectionCard>
    )
  }

  if (document.mime_type?.startsWith("image/")) {
    return (
      <SectionCard title="Preview" contentClassName="flex items-center justify-center bg-muted/30">
        <img
          src={document.signedUrl}
          alt={document.file_name}
          className="max-h-[480px] w-auto rounded-lg object-contain"
        />
      </SectionCard>
    )
  }

  if (document.mime_type === "application/pdf") {
    return (
      <SectionCard title="Preview" contentClassName="p-0">
        <iframe src={document.signedUrl} title={document.file_name} className="h-[480px] w-full rounded-b-2xl" />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Preview">
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Preview isn&apos;t available for this file type. Download it to view the contents.
        </p>
      </div>
    </SectionCard>
  )
}
