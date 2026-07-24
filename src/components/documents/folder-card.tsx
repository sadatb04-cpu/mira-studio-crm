import Link from "next/link"
import { format } from "date-fns"
import { Folder } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatFileSize } from "@/types/document"
import type { DocumentFolderSummary } from "@/types/document"

interface FolderCardProps {
  folder: DocumentFolderSummary
}

export function FolderCard({ folder }: FolderCardProps) {
  return (
    <Link href={`/documents/folders/${folder.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Folder className="size-5 text-primary" />
            <span className="font-medium text-foreground">{folder.name}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>{folder.documentCount === 1 ? "1 Document" : `${folder.documentCount} Documents`}</span>
            {folder.storageBytes > 0 && <span>{formatFileSize(folder.storageBytes)}</span>}
            <span>Updated {format(new Date(folder.updated_at), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
