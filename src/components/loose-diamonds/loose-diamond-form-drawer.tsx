"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { createLooseDiamond, updateLooseDiamond } from "@/app/actions/loose-diamonds"
import { createDocument } from "@/app/actions/documents"
import { ALLOWED_DOCUMENT_MIME_TYPES } from "@/types/document"
import {
  DIAMOND_CLARITY_SUGGESTIONS,
  DIAMOND_COLOR_SUGGESTIONS,
  DIAMOND_GROWTH_TYPE_SUGGESTIONS,
  DIAMOND_SHAPE_SUGGESTIONS,
  LOOSE_DIAMOND_STATUSES,
  LOOSE_DIAMOND_STATUS_LABELS,
} from "@/types/loose-diamond"
import type { LooseDiamondDetail, LooseDiamondFormInput } from "@/types/loose-diamond"
import type { SupplierOption } from "@/lib/supabase/inventory-shared"

const DOCUMENTS_BUCKET = "documents"

const DEFAULT_FORM: LooseDiamondFormInput = {
  reportNumber: "",
  lab: "",
  shape: "",
  carat: 0,
  color: "",
  clarity: "",
  cut: "",
  polish: "",
  symmetry: "",
  fluorescence: "",
  growthType: "",
  countryOfOrigin: "",
  costUsd: 0,
  sellingPrice: 0,
  status: "available",
  supplierId: "",
  notes: "",
}

function toFormInput(diamond: LooseDiamondDetail): LooseDiamondFormInput {
  return {
    reportNumber: diamond.report_number,
    lab: diamond.lab ?? "",
    shape: diamond.shape ?? "",
    carat: diamond.carat,
    color: diamond.color ?? "",
    clarity: diamond.clarity ?? "",
    cut: diamond.cut ?? "",
    polish: diamond.polish ?? "",
    symmetry: diamond.symmetry ?? "",
    fluorescence: diamond.fluorescence ?? "",
    growthType: diamond.growth_type ?? "",
    countryOfOrigin: diamond.country_of_origin ?? "",
    costUsd: diamond.cost_usd,
    sellingPrice: diamond.selling_price,
    status: diamond.status,
    supplierId: diamond.supplier_id ?? "",
    notes: diamond.notes ?? "",
  }
}

interface LooseDiamondFormDrawerProps {
  suppliers: SupplierOption[]
  diamond?: LooseDiamondDetail
}

// One component for both Add and Edit - editing an existing diamond never
// touches its status here (status transitions go through the dedicated
// status dialog on the detail page, so they're always captured as a
// stock movement rather than silently overwritten by a general edit).
export function LooseDiamondFormDrawer({ suppliers, diamond }: LooseDiamondFormDrawerProps) {
  const router = useRouter()
  const isEdit = Boolean(diamond)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LooseDiamondFormInput>(diamond ? toFormInput(diamond) : DEFAULT_FORM)
  const [documents, setDocuments] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const documentInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof LooseDiamondFormInput>(key: K, value: LooseDiamondFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setForm(diamond ? toFormInput(diamond) : DEFAULT_FORM)
    setDocuments([])
    setError(null)
  }

  async function attachDocuments(diamondId: string) {
    if (documents.length === 0) return { failures: 0 }

    const supabase = createClient()

    // Each file's own upload-then-create-record is a genuine dependency (the
    // document needs the storage path), but different files are independent
    // of each other - uploading them concurrently instead of one at a time
    // turns N sequential round trips into one wait for the slowest.
    const results = await Promise.all(
      documents.map(async (file) => {
        const storagePath = `${crypto.randomUUID()}/${file.name}`
        const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(storagePath, file, {
          contentType: file.type,
        })

        if (uploadError) return { failed: true }

        const result = await createDocument({
          documentType: file.type.startsWith("image/") ? "image" : "igi_certificate",
          description: `${form.reportNumber} - ${file.name}`,
          relatedRecordType: "loose_diamond",
          relatedRecordId: diamondId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
          storagePath,
        })

        if (result.error) {
          await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
          return { failed: true }
        }

        return { failed: false }
      })
    )

    return { failures: results.filter((r) => r.failed).length }
  }

  function handleSubmit() {
    setError(null)

    if (!form.reportNumber.trim()) {
      setError("Report Number is required.")
      return
    }
    if (!form.carat || form.carat <= 0) {
      setError("Carat must be greater than 0.")
      return
    }

    setIsSaving(true)

    void (async () => {
      const result = isEdit ? await updateLooseDiamond(diamond!.id, form) : await createLooseDiamond(form)

      if (result.error) {
        setIsSaving(false)
        setError(result.error)
        return
      }

      const newId = isEdit ? diamond!.id : (result as { id?: string }).id
      const { failures } = newId ? await attachDocuments(newId) : { failures: 0 }

      setIsSaving(false)

      if (failures > 0) {
        toast.error(`Saved, but ${failures} file(s) couldn't be attached.`)
      } else {
        toast.success(isEdit ? "Diamond updated." : "Diamond added to inventory.")
      }

      setOpen(false)
      reset()
      router.refresh()
    })()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <SheetTrigger asChild>
        {isEdit ? (
          <Button type="button" size="sm" variant="outline">
            Edit Details
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Diamond
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full max-w-2xl gap-6">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Loose Diamond" : "Add Loose Diamond"}</SheetTitle>
          <SheetDescription>Record grading detail, pricing, and sourcing for this stone.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Identification</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-report-number">
                  Report Number<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="diamond-report-number"
                  value={form.reportNumber}
                  onChange={(event) => update("reportNumber", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-lab">Lab</Label>
                <Input id="diamond-lab" value={form.lab} onChange={(event) => update("lab", event.target.value)} placeholder="IGI, GIA..." />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Grading Detail</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-shape">Shape</Label>
                <Select
                  value={form.shape || "none"}
                  onValueChange={(value) => update("shape", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="diamond-shape">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {DIAMOND_SHAPE_SUGGESTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-carat">
                  Carat<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="diamond-carat"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.carat}
                  onChange={(event) => update("carat", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-color">Color</Label>
                <Select
                  value={form.color || "none"}
                  onValueChange={(value) => update("color", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="diamond-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {DIAMOND_COLOR_SUGGESTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-clarity">Clarity</Label>
                <Select
                  value={form.clarity || "none"}
                  onValueChange={(value) => update("clarity", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="diamond-clarity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {DIAMOND_CLARITY_SUGGESTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-cut">Cut</Label>
                <Input id="diamond-cut" value={form.cut} onChange={(event) => update("cut", event.target.value)} placeholder="Excellent..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-polish">Polish</Label>
                <Input id="diamond-polish" value={form.polish} onChange={(event) => update("polish", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-symmetry">Symmetry</Label>
                <Input id="diamond-symmetry" value={form.symmetry} onChange={(event) => update("symmetry", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-fluorescence">Fluorescence</Label>
                <Input id="diamond-fluorescence" value={form.fluorescence} onChange={(event) => update("fluorescence", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-growth-type">Growth Type</Label>
                <Select
                  value={form.growthType || "none"}
                  onValueChange={(value) => update("growthType", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="diamond-growth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {DIAMOND_GROWTH_TYPE_SUGGESTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-origin">Country of Origin</Label>
                <Input id="diamond-origin" value={form.countryOfOrigin} onChange={(event) => update("countryOfOrigin", event.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pricing & Sourcing</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-cost">Cost (USD)</Label>
                <Input
                  id="diamond-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.costUsd}
                  onChange={(event) => update("costUsd", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-selling-price">Selling Price</Label>
                <Input
                  id="diamond-selling-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(event) => update("sellingPrice", Number(event.target.value))}
                />
              </div>
              {!isEdit && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="diamond-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => update("status", value as LooseDiamondFormInput["status"])}
                  >
                    <SelectTrigger id="diamond-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOSE_DIAMOND_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {LOOSE_DIAMOND_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diamond-supplier">Supplier</Label>
                <Select
                  value={form.supplierId || "none"}
                  onValueChange={(value) => update("supplierId", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="diamond-supplier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</h3>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional notes about this stone..."
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Certificate & Images</h3>
            <div className="flex flex-col gap-2">
              <input
                ref={documentInputRef}
                type="file"
                accept={ALLOWED_DOCUMENT_MIME_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(event) => setDocuments((current) => [...current, ...Array.from(event.target.files ?? [])])}
              />
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => documentInputRef.current?.click()}>
                <Upload className="size-3.5" data-icon="inline-start" />
                Add Certificate / Image
              </Button>
              {documents.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {documents.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-foreground">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setDocuments((current) => current.filter((_, i) => i !== index))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            {isEdit ? "Save Changes" : "Add Diamond"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
