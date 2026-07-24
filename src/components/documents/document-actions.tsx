"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, FolderInput, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { deleteDocument, downloadDocument } from "@/app/actions/documents"
import { moveDocumentToFolder } from "@/app/actions/document-folders"
import type { FolderOption } from "@/types/document"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface DocumentActionsProps {
  documentId: string
  fileName: string
  currentFolderId: string | null
  folders: FolderOption[]
}

export function DocumentActions({ documentId, fileName, currentFolderId, folders }: DocumentActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId ?? "")
  const [moveError, setMoveError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, startDownload] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isMoving, startMove] = useTransition()

  function handleMove() {
    setMoveError(null)
    startMove(async () => {
      const result = await moveDocumentToFolder(documentId, selectedFolderId || null)
      if (result.error) {
        setMoveError(result.error)
        return
      }
      setMoveOpen(false)
      router.refresh()
    })
  }

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedFolderId(currentFolderId ?? "")
            setMoveError(null)
            setMoveOpen(true)
          }}
        >
          <FolderInput className="size-3.5" data-icon="inline-start" />
          Move
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="size-3.5" data-icon="inline-start" />
          Delete
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>Choose which folder this document belongs to.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="move-folder">Folder</Label>
            <select
              id="move-folder"
              value={selectedFolderId}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              className={selectClassName}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            {moveError && <p className="text-sm text-destructive">{moveError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)} disabled={isMoving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleMove} disabled={isMoving}>
              {isMoving && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
