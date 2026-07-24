"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Upload } from "lucide-react"

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
import { createClient } from "@/lib/supabase/client"
import { createDocument } from "@/app/actions/documents"
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  RELATED_RECORD_TYPES,
  RELATED_RECORD_TYPE_LABELS,
} from "@/types/document"
import type { DocumentType, RelatedRecordOption, RelatedRecordType } from "@/types/document"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

const BUCKET = "documents"

interface DocumentUploadDialogProps {
  orders: RelatedRecordOption[]
  customers: RelatedRecordOption[]
  productionJobs: RelatedRecordOption[]
}

export function DocumentUploadDialog({ orders, customers, productionJobs }: DocumentUploadDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>("other")
  const [description, setDescription] = useState("")
  const [relatedRecordType, setRelatedRecordType] = useState<RelatedRecordType | "">("")
  const [relatedRecordId, setRelatedRecordId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const relatedOptions: RelatedRecordOption[] =
    relatedRecordType === "order" ? orders : relatedRecordType === "customer" ? customers : productionJobs

  function reset() {
    setFile(null)
    setDocumentType("other")
    setDescription("")
    setRelatedRecordType("")
    setRelatedRecordId("")
    setError(null)
  }

  function handleSubmit() {
    setError(null)

    if (!file) {
      setError("File is required.")
      return
    }

    if (description.trim() === "") {
      setError("Description is required.")
      return
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      setError("File must be 25 MB or smaller.")
      return
    }

    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      setError("Unsupported file type.")
      return
    }

    if (relatedRecordType && !relatedRecordId) {
      setError("Select a related record.")
      return
    }

    setIsUploading(true)

    startTransition(async () => {
      const supabase = createClient()
      const storagePath = `${crypto.randomUUID()}/${file.name}`

      // The browser Supabase client re-uses the same session JWT the server
      // uses, so Storage RLS still authenticates this upload - it does not
      // bypass auth. The installed storage-js version has no reliable
      // byte-level progress callback, so this shows an honest indeterminate
      // "Uploading..." state rather than a fabricated percentage.
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
        contentType: file.type,
      })

      if (uploadError) {
        setIsUploading(false)
        setError(uploadError.message)
        return
      }

      const result = await createDocument({
        documentType,
        description,
        relatedRecordType: relatedRecordType || undefined,
        relatedRecordId: relatedRecordType ? relatedRecordId : undefined,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
        storagePath,
      })

      setIsUploading(false)

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" data-icon="inline-start" />
          Upload Document
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Attach a file and describe how it relates to your records.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">
              File<span className="text-destructive">*</span>
            </Label>
            <Input
              id="file"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              accept={ALLOWED_DOCUMENT_MIME_TYPES.join(",")}
            />
            <p className="text-xs text-muted-foreground">PDF, Word, Excel, or image files up to 25 MB.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-type">
              Document Type<span className="text-destructive">*</span>
            </Label>
            <select
              id="document-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as DocumentType)}
              className={selectClassName}
            >
              {DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {DOCUMENT_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">
              Document Description<span className="text-destructive">*</span>
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="e.g. Payment receipt sent to manufacturer"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="related-record-type">Related Record Type</Label>
              <select
                id="related-record-type"
                value={relatedRecordType}
                onChange={(event) => {
                  setRelatedRecordType(event.target.value as RelatedRecordType | "")
                  setRelatedRecordId("")
                }}
                className={selectClassName}
              >
                <option value="">None</option>
                {RELATED_RECORD_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {RELATED_RECORD_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="related-record-id">Related Record</Label>
              <select
                id="related-record-id"
                value={relatedRecordId}
                onChange={(event) => setRelatedRecordId(event.target.value)}
                disabled={!relatedRecordType}
                className={selectClassName}
              >
                <option value="">{relatedRecordType ? "Select..." : "N/A"}</option>
                {relatedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="size-3.5" data-icon="inline-start" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
