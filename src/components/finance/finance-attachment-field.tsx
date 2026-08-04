"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ALLOWED_FINANCE_MIME_TYPES } from "@/types/finance"

interface FinanceAttachmentFieldProps {
  file: File | null
  onFileChange: (file: File | null) => void
  googleSheetUrl: string
  onGoogleSheetUrlChange: (value: string) => void
  existingFileName?: string | null
  label?: string
}

// Shared by every Finance form (manufacturer invoice, seller invoice,
// expense) - all three accept the exact same "a file OR a Google Sheets
// link" attachment, per the module spec.
export function FinanceAttachmentField({
  file,
  onFileChange,
  googleSheetUrl,
  onGoogleSheetUrlChange,
  existingFileName,
  label = "Upload Invoice",
}: FinanceAttachmentFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="finance-attachment-file">{label}</Label>
        <Input
          id="finance-attachment-file"
          type="file"
          accept={ALLOWED_FINANCE_MIME_TYPES.join(",")}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          {file
            ? file.name
            : existingFileName
              ? `Current file: ${existingFileName}. Choose a new file to replace it.`
              : "PDF, image, Word, Excel, or CSV up to 25 MB."}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or paste a link
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="finance-attachment-sheet-url">Google Sheets Link</Label>
        <Input
          id="finance-attachment-sheet-url"
          type="url"
          value={googleSheetUrl}
          onChange={(event) => onGoogleSheetUrlChange(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/..."
        />
      </div>
    </div>
  )
}
