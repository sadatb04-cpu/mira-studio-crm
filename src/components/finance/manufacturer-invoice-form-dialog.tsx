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
import { FinanceAttachmentField } from "@/components/finance/finance-attachment-field"
import { uploadFinanceFile } from "@/lib/supabase/finance-upload"
import { createManufacturerInvoice, updateManufacturerInvoice } from "@/app/actions/finance-manufacturers"
import { ALLOWED_FINANCE_MIME_TYPES, MAX_FINANCE_FILE_SIZE_BYTES } from "@/types/finance"
import type { FinanceManufacturerInvoiceListItem } from "@/types/finance"

interface ManufacturerInvoiceFormDialogProps {
  manufacturerId: string
  mode: "create" | "edit"
  invoice?: FinanceManufacturerInvoiceListItem
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ManufacturerInvoiceFormDialog({ manufacturerId, mode, invoice, open: openProp, onOpenChange }: ManufacturerInvoiceFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = onOpenChange !== undefined
  const open = isControlled ? (openProp ?? false) : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [productType, setProductType] = useState(invoice?.product_type ?? "")
  const [manufacturingPrice, setManufacturingPrice] = useState(invoice ? String(invoice.manufacturing_price) : "")
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoice_date ?? "")
  const [notes, setNotes] = useState(invoice?.notes ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState(invoice?.google_sheet_url ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setProductType(invoice?.product_type ?? "")
      setManufacturingPrice(invoice ? String(invoice.manufacturing_price) : "")
      setInvoiceDate(invoice?.invoice_date ?? "")
      setNotes(invoice?.notes ?? "")
      setFile(null)
      setGoogleSheetUrl(invoice?.google_sheet_url ?? "")
      setError(null)
    }
  }

  function handleSubmit() {
    setError(null)

    const price = Number(manufacturingPrice)

    if (productType.trim() === "") {
      setError("Product type is required.")
      return
    }
    if (!manufacturingPrice || Number.isNaN(price) || price <= 0) {
      setError("Enter a manufacturing price greater than 0.")
      return
    }
    if (!invoiceDate) {
      setError("Date is required.")
      return
    }
    if (!file && !googleSheetUrl && !invoice?.file_url) {
      setError("Upload a file or add a Google Sheets link.")
      return
    }
    if (file && file.size > MAX_FINANCE_FILE_SIZE_BYTES) {
      setError("File must be 25 MB or smaller.")
      return
    }
    if (file && !ALLOWED_FINANCE_MIME_TYPES.includes(file.type as (typeof ALLOWED_FINANCE_MIME_TYPES)[number])) {
      setError("Unsupported file type.")
      return
    }

    startTransition(async () => {
      let storagePath: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined
      let mimeType: (typeof ALLOWED_FINANCE_MIME_TYPES)[number] | undefined

      if (file) {
        setIsUploading(true)
        const uploadResult = await uploadFinanceFile(file)
        setIsUploading(false)

        if (uploadResult.error) {
          setError(uploadResult.error)
          return
        }

        storagePath = uploadResult.storagePath
        fileName = file.name
        fileSize = file.size
        mimeType = file.type as (typeof ALLOWED_FINANCE_MIME_TYPES)[number]
      } else if (!googleSheetUrl && invoice?.file_url) {
        // Editing without picking a new file/link keeps the existing
        // attachment as-is.
        storagePath = invoice.file_url
        fileName = invoice.file_name ?? undefined
        fileSize = invoice.file_size ?? undefined
        mimeType = (invoice.mime_type ?? undefined) as (typeof ALLOWED_FINANCE_MIME_TYPES)[number] | undefined
      }

      const input = {
        manufacturerId,
        productType,
        manufacturingPrice: price,
        invoiceDate,
        notes: notes || undefined,
        fileName,
        fileSize,
        mimeType,
        storagePath,
        googleSheetUrl: googleSheetUrl || undefined,
      }

      const result = mode === "create" ? await createManufacturerInvoice(input) : await updateManufacturerInvoice(invoice!.id, input)

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      {mode === "create" && (
        <DialogTrigger asChild>
          <Button type="button" size="sm">
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Invoice
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Invoice" : "Edit Invoice"}</DialogTitle>
          <DialogDescription>Record a manufacturing invoice for this manufacturer.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FinanceAttachmentField
            file={file}
            onFileChange={setFile}
            googleSheetUrl={googleSheetUrl}
            onGoogleSheetUrlChange={setGoogleSheetUrl}
            existingFileName={invoice?.file_name}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-type">
              Product Type<span className="text-destructive">*</span>
            </Label>
            <Input id="product-type" value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="e.g. Loose Diamonds" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manufacturing-price">
                Manufacturing Price<span className="text-destructive">*</span>
              </Label>
              <Input
                id="manufacturing-price"
                type="number"
                min="0"
                step="0.01"
                value={manufacturingPrice}
                onChange={(event) => setManufacturingPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-date">
                Date<span className="text-destructive">*</span>
              </Label>
              <Input id="invoice-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-notes">Notes</Label>
            <textarea
              id="invoice-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional"
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
            {isUploading ? "Uploading..." : mode === "create" ? "Add Invoice" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
