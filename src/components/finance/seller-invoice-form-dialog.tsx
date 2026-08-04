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
import { createSellerInvoice, updateSellerInvoice } from "@/app/actions/finance-sellers"
import { ALLOWED_FINANCE_MIME_TYPES, MAX_FINANCE_FILE_SIZE_BYTES } from "@/types/finance"
import type { FinanceSellerInvoiceListItem } from "@/types/finance"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface SellerInvoiceFormDialogProps {
  sellerId: string
  mode: "create" | "edit"
  invoice?: FinanceSellerInvoiceListItem
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SellerInvoiceFormDialog({ sellerId, mode, invoice, open: openProp, onOpenChange }: SellerInvoiceFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = onOpenChange !== undefined
  const open = isControlled ? (openProp ?? false) : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [productName, setProductName] = useState(invoice?.product_name ?? "")
  const [manufacturingPrice, setManufacturingPrice] = useState(invoice ? String(invoice.manufacturing_price) : "")
  const [sellingPrice, setSellingPrice] = useState(invoice ? String(invoice.selling_price) : "")
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoice_date ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState(invoice?.google_sheet_url ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setProductName(invoice?.product_name ?? "")
      setManufacturingPrice(invoice ? String(invoice.manufacturing_price) : "")
      setSellingPrice(invoice ? String(invoice.selling_price) : "")
      setInvoiceDate(invoice?.invoice_date ?? "")
      setFile(null)
      setGoogleSheetUrl(invoice?.google_sheet_url ?? "")
      setError(null)
    }
  }

  const manufacturingPriceNumber = Number(manufacturingPrice)
  const sellingPriceNumber = Number(sellingPrice)
  const profitPreview =
    manufacturingPrice && sellingPrice && !Number.isNaN(manufacturingPriceNumber) && !Number.isNaN(sellingPriceNumber)
      ? sellingPriceNumber - manufacturingPriceNumber
      : null

  function handleSubmit() {
    setError(null)

    if (productName.trim() === "") {
      setError("Product name is required.")
      return
    }
    if (!manufacturingPrice || Number.isNaN(manufacturingPriceNumber) || manufacturingPriceNumber <= 0) {
      setError("Enter a manufacturing price greater than 0.")
      return
    }
    if (!sellingPrice || Number.isNaN(sellingPriceNumber) || sellingPriceNumber <= 0) {
      setError("Enter a selling price greater than 0.")
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
        storagePath = invoice.file_url
        fileName = invoice.file_name ?? undefined
        fileSize = invoice.file_size ?? undefined
        mimeType = (invoice.mime_type ?? undefined) as (typeof ALLOWED_FINANCE_MIME_TYPES)[number] | undefined
      }

      const input = {
        sellerId,
        productName,
        manufacturingPrice: manufacturingPriceNumber,
        sellingPrice: sellingPriceNumber,
        invoiceDate,
        fileName,
        fileSize,
        mimeType,
        storagePath,
        googleSheetUrl: googleSheetUrl || undefined,
      }

      const result = mode === "create" ? await createSellerInvoice(input) : await updateSellerInvoice(invoice!.id, input)

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
          <DialogDescription>Record a sale for this seller. Profit is calculated automatically.</DialogDescription>
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
            <Label htmlFor="product-name">
              Product Name<span className="text-destructive">*</span>
            </Label>
            <Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="e.g. Diamond Ring" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller-manufacturing-price">
                Manufacturing Price<span className="text-destructive">*</span>
              </Label>
              <Input
                id="seller-manufacturing-price"
                type="number"
                min="0"
                step="0.01"
                value={manufacturingPrice}
                onChange={(event) => setManufacturingPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="selling-price">
                Selling Price<span className="text-destructive">*</span>
              </Label>
              <Input
                id="selling-price"
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Profit</Label>
              <div className="flex h-8 items-center rounded-lg border border-input bg-muted/50 px-3 text-sm font-medium text-foreground">
                {profitPreview === null ? "—" : formatCurrency(profitPreview)}
              </div>
              <p className="text-xs text-muted-foreground">Calculated automatically. Selling Price − Manufacturing Price.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller-invoice-date">
                Date<span className="text-destructive">*</span>
              </Label>
              <Input id="seller-invoice-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
            </div>
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
