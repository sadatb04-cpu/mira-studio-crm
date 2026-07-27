"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createDocumentFolder, updateDocumentFolder } from "@/app/actions/document-folders"

interface FolderFormDialogProps {
  mode: "create" | "rename"
  folderId?: string
  initialName?: string
  initialDescription?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FolderFormDialog({
  mode,
  folderId,
  initialName = "",
  initialDescription = "",
  open: openProp,
  onOpenChange,
}: FolderFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = onOpenChange !== undefined
  const open = isControlled ? (openProp ?? false) : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset the form fields whenever the dialog transitions from closed to
  // open (e.g. reopening "Rename" on a different folder). Adjusted during
  // render rather than in an effect, per React's guidance for deriving
  // state from a changed prop.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setName(initialName)
      setDescription(initialDescription)
      setError(null)
    }
  }

  function handleSubmit() {
    setError(null)

    if (name.trim() === "") {
      setError("Folder name is required.")
      return
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDocumentFolder({ name, description: description || undefined })
          : await updateDocumentFolder(folderId as string, { name, description: description || undefined })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" data-icon="inline-start" />
            New Folder
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Folder" : "Rename Folder"}</DialogTitle>
          <DialogDescription>Folders help organize documents by department, purpose, or record type.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">
              Folder Name<span className="text-destructive">*</span>
            </Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Employees"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-description">Description</Label>
            <textarea
              id="folder-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional notes about what belongs in this folder"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
