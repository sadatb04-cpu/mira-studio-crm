"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { deleteDocument, downloadDocument } from "@/app/actions/documents"

interface DocumentActionsProps {
  documentId: string
  fileName: string
}

export function DocumentActions({ documentId, fileName }: DocumentActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, startDownload] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleDownload() {
    setError(null)
    startDownload(async () => {
      const result = await downloadDocument(documentId)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.signedUrl) {
        window.open(result.signedUrl, "_blank", "noopener,noreferrer")
      }
    })
  }

  function handleDelete() {
    setError(null)
    startDelete(async () => {
      const result = await deleteDocument(documentId)
      if (result.error) {
        setError(result.error)
        return
      }
      setConfirmOpen(false)
      router.push("/documents")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
          ) : (
            <Download className="size-3.5" data-icon="inline-start" />
          )}
          Download
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="size-3.5" data-icon="inline-start" />
          Delete
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete document"
        description={`Are you sure you want to delete "${fileName}"? This will permanently remove the file and cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
