"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FolderFormDialog } from "@/components/documents/folder-form-dialog"
import { deleteDocumentFolder } from "@/app/actions/document-folders"

interface FolderActionsProps {
  folderId: string
  folderName: string
  folderDescription: string | null
}

export function FolderActions({ folderId, folderName, folderDescription }: FolderActionsProps) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  function handleDelete() {
    setError(null)
    startDelete(async () => {
      const result = await deleteDocumentFolder(folderId)
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
        <Button type="button" variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
          <Pencil className="size-3.5" data-icon="inline-start" />
          Rename
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          {isDeleting ? (
            <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
          ) : (
            <Trash2 className="size-3.5" data-icon="inline-start" />
          )}
          Delete
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <FolderFormDialog
        mode="rename"
        folderId={folderId}
        initialName={folderName}
        initialDescription={folderDescription ?? ""}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete folder"
        description={`Are you sure you want to delete "${folderName}"? Documents inside will not be deleted - they will simply become unassigned from any folder.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
