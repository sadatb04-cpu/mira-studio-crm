"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, RefreshCw, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { createInventoryItem, generateSkuAction } from "@/app/actions/inventory"
import { createDocument } from "@/app/actions/documents"
import { ALLOWED_DOCUMENT_MIME_TYPES } from "@/types/document"
import { INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/types/inventory"
import type { InventoryCategory, InventoryItemFormInput, SupplierOption } from "@/types/inventory"

const DOCUMENTS_BUCKET = "documents"
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"]

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

const DEFAULT_FORM: InventoryItemFormInput = {
  name: "",
  sku: "",
  category: "gold",
  supplierId: "",
  unit: "pcs",
  currentStock: 0,
  minimumStock: 0,
  reorderLevel: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  metal: "",
  purity: "",
  weight: undefined,
  stoneType: "",
  stoneWeight: undefined,
  certificateNumber: "",
  notes: "",
}

interface InventoryAddDrawerProps {
  suppliers: SupplierOption[]
}

export function InventoryAddDrawer({ suppliers }: InventoryAddDrawerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<InventoryItemFormInput>(DEFAULT_FORM)
  const [skuEdited, setSkuEdited] = useState(false)
  const [isGeneratingSku, setIsGeneratingSku] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [documents, setDocuments] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  async function suggestSku(category: InventoryCategory) {
    setIsGeneratingSku(true)
    const result = await generateSkuAction(category)
    setIsGeneratingSku(false)
    if (result.sku) {
      setForm((current) => ({ ...current, sku: result.sku! }))
    }
  }

  useEffect(() => {
    if (!open || skuEdited) return
    const timer = setTimeout(() => void suggestSku(form.category), 0)
    return () => clearTimeout(timer)
    // Only re-suggest when the drawer opens or the category changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.category])

  function update<K extends keyof InventoryItemFormInput>(key: K, value: InventoryItemFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setForm(DEFAULT_FORM)
    setSkuEdited(false)
    setImages([])
    setDocuments([])
    setError(null)
  }

  async function attachFiles(itemId: string, itemName: string, files: File[], documentType: "image" | "other") {
    if (files.length === 0) return { failures: 0 }

    const supabase = createClient()
    let failures = 0

    for (const file of files) {
      const storagePath = `${crypto.randomUUID()}/${file.name}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(storagePath, file, {
        contentType: file.type,
      })

      if (uploadError) {
        failures += 1
        continue
      }

      const result = await createDocument({
        documentType,
        description: `${itemName} - ${file.name}`,
        relatedRecordType: "inventory_item",
        relatedRecordId: itemId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
        storagePath,
      })

      if (result.error) {
        failures += 1
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
      }
    }

    return { failures }
  }

  function handleSubmit() {
    setError(null)

    if (!form.name.trim()) {
      setError("Item name is required.")
      return
    }
    if (!form.sku.trim()) {
      setError("SKU is required.")
      return
    }
    if (!form.unit.trim()) {
      setError("Unit is required.")
      return
    }

    setIsSaving(true)

    void (async () => {
      const result = await createInventoryItem(form)

      if (result.error || !result.id) {
        setIsSaving(false)
        setError(result.error ?? "Unable to create inventory item.")
        return
      }

      const [imageResult, documentResult] = await Promise.all([
        attachFiles(result.id, form.name, images, "image"),
        attachFiles(result.id, form.name, documents, "other"),
      ])

      setIsSaving(false)

      const totalFailures = imageResult.failures + documentResult.failures
      if (totalFailures > 0) {
        toast.error(`Item created, but ${totalFailures} file(s) couldn't be attached.`)
      } else {
        toast.success("Inventory item created.")
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
        <Button size="sm">
          <Plus className="size-3.5" data-icon="inline-start" />
          Add Inventory
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full max-w-2xl gap-6">
        <SheetHeader>
          <SheetTitle>Add Inventory Item</SheetTitle>
          <SheetDescription>Record a new item in stock, with its jewelry-specific details.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Basic Info</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="item-name">
                  Item Name<span className="text-destructive">*</span>
                </Label>
                <Input id="item-name" value={form.name} onChange={(event) => update("name", event.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-sku">
                  SKU<span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="item-sku"
                    value={form.sku}
                    onChange={(event) => {
                      setSkuEdited(true)
                      update("sku", event.target.value)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isGeneratingSku}
                    title="Generate a new SKU"
                    onClick={() => {
                      setSkuEdited(false)
                      void suggestSku(form.category)
                    }}
                  >
                    <RefreshCw className={isGeneratingSku ? "size-3.5 animate-spin" : "size-3.5"} />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-category">Category</Label>
                <select
                  id="item-category"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value as InventoryCategory)}
                  className={selectClassName}
                >
                  {INVENTORY_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {INVENTORY_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-supplier">Supplier</Label>
                <select
                  id="item-supplier"
                  value={form.supplierId}
                  onChange={(event) => update("supplierId", event.target.value)}
                  className={selectClassName}
                >
                  <option value="">None</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-unit">
                  Unit<span className="text-destructive">*</span>
                </Label>
                <Input id="item-unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} placeholder="pcs, g, ct..." />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Stock & Pricing</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-current-stock">Current Stock</Label>
                <Input
                  id="item-current-stock"
                  type="number"
                  min={0}
                  value={form.currentStock}
                  onChange={(event) => update("currentStock", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-min-stock">Minimum Stock</Label>
                <Input
                  id="item-min-stock"
                  type="number"
                  min={0}
                  value={form.minimumStock}
                  onChange={(event) => update("minimumStock", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-reorder-level">Reorder Level</Label>
                <Input
                  id="item-reorder-level"
                  type="number"
                  min={0}
                  value={form.reorderLevel}
                  onChange={(event) => update("reorderLevel", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-purchase-price">Purchase Price</Label>
                <Input
                  id="item-purchase-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(event) => update("purchasePrice", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-selling-price">Selling Price</Label>
                <Input
                  id="item-selling-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(event) => update("sellingPrice", Number(event.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Jewelry Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-metal">Metal</Label>
                <Input id="item-metal" value={form.metal} onChange={(event) => update("metal", event.target.value)} placeholder="Gold, Silver..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-purity">Purity</Label>
                <Input id="item-purity" value={form.purity} onChange={(event) => update("purity", event.target.value)} placeholder="18K, 22K..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-weight">Weight (g)</Label>
                <Input
                  id="item-weight"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.weight ?? ""}
                  onChange={(event) => update("weight", event.target.value === "" ? undefined : Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-stone-type">Stone Type</Label>
                <Input id="item-stone-type" value={form.stoneType} onChange={(event) => update("stoneType", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-stone-weight">Stone Weight (ct)</Label>
                <Input
                  id="item-stone-weight"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.stoneWeight ?? ""}
                  onChange={(event) => update("stoneWeight", event.target.value === "" ? undefined : Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-certificate">Certificate Number</Label>
                <Input
                  id="item-certificate"
                  value={form.certificateNumber}
                  onChange={(event) => update("certificateNumber", event.target.value)}
                />
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
              placeholder="Optional notes about this item..."
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Images & Documents</h3>

            <div className="flex flex-col gap-2">
              <Label>Images</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_MIME_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(event) => setImages((current) => [...current, ...Array.from(event.target.files ?? [])])}
              />
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => imageInputRef.current?.click()}>
                <Upload className="size-3.5" data-icon="inline-start" />
                Add Images
              </Button>
              {images.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {images.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-foreground">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Documents</Label>
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
                Add Documents
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
            Save Item
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
