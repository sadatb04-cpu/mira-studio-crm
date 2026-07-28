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
import { createJewelryItem, updateJewelryItem } from "@/app/actions/jewelry"
import { createDocument } from "@/app/actions/documents"
import { ALLOWED_DOCUMENT_MIME_TYPES } from "@/types/document"
import { JEWELRY_CATEGORIES, JEWELRY_STATUSES, JEWELRY_STATUS_LABELS } from "@/types/jewelry"
import type { JewelryCategory, JewelryDetail, JewelryFormInput, JewelryStatus } from "@/types/jewelry"
import type { SupplierOption } from "@/lib/supabase/inventory-shared"

const DOCUMENTS_BUCKET = "documents"
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"]

const DEFAULT_FORM: JewelryFormInput = {
  sku: "",
  productName: "",
  category: undefined,
  metal: "",
  metalPurity: "",
  diamondType: "",
  diamondWeight: undefined,
  grossWeight: undefined,
  netWeight: undefined,
  cost: 0,
  sellingPrice: 0,
  currentStock: 0,
  reorderLevel: 1,
  status: "active",
  location: "",
  supplierId: "",
  notes: "",
}

function toFormInput(item: JewelryDetail): JewelryFormInput {
  return {
    sku: item.sku,
    productName: item.product_name,
    category: (item.category as JewelryCategory) ?? undefined,
    metal: item.metal ?? "",
    metalPurity: item.metal_purity ?? "",
    diamondType: item.diamond_type ?? "",
    diamondWeight: item.diamond_weight ?? undefined,
    grossWeight: item.gross_weight ?? undefined,
    netWeight: item.net_weight ?? undefined,
    cost: item.cost,
    sellingPrice: item.selling_price,
    currentStock: item.quantity,
    reorderLevel: item.reorder_level,
    status: item.status,
    location: item.location ?? "",
    supplierId: item.supplier_id ?? "",
    notes: item.notes ?? "",
  }
}

interface JewelryFormDrawerProps {
  suppliers: SupplierOption[]
  item?: JewelryDetail
}

export function JewelryFormDrawer({ suppliers, item }: JewelryFormDrawerProps) {
  const router = useRouter()
  const isEdit = Boolean(item)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<JewelryFormInput>(item ? toFormInput(item) : DEFAULT_FORM)
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof JewelryFormInput>(key: K, value: JewelryFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setForm(item ? toFormInput(item) : DEFAULT_FORM)
    setImages([])
    setError(null)
  }

  async function attachImages(itemId: string) {
    if (images.length === 0) return { failures: 0 }

    const supabase = createClient()
    let failures = 0

    for (const file of images) {
      const storagePath = `${crypto.randomUUID()}/${file.name}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(storagePath, file, { contentType: file.type })

      if (uploadError) {
        failures += 1
        continue
      }

      const result = await createDocument({
        documentType: "image",
        description: `${form.productName} - ${file.name}`,
        relatedRecordType: "jewelry_item",
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

    if (!form.sku.trim()) {
      setError("SKU is required.")
      return
    }
    if (!form.productName.trim()) {
      setError("Product name is required.")
      return
    }

    setIsSaving(true)

    void (async () => {
      const result = isEdit ? await updateJewelryItem(item!.id, form) : await createJewelryItem(form)

      if (result.error) {
        setIsSaving(false)
        setError(result.error)
        return
      }

      const newId = isEdit ? item!.id : (result as { id?: string }).id
      const { failures } = newId ? await attachImages(newId) : { failures: 0 }

      setIsSaving(false)

      if (failures > 0) {
        toast.error(`Saved, but ${failures} image(s) couldn't be attached.`)
      } else {
        toast.success(isEdit ? "Item updated." : "Item added to inventory.")
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
            Add Item
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full max-w-2xl gap-6">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Jewelry Item" : "Add Jewelry Item"}</SheetTitle>
          <SheetDescription>Record product detail, stock, and pricing.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Basic Info</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-sku">
                  SKU<span className="text-destructive">*</span>
                </Label>
                <Input id="jewelry-sku" value={form.sku} onChange={(event) => update("sku", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-name">
                  Product Name<span className="text-destructive">*</span>
                </Label>
                <Input id="jewelry-name" value={form.productName} onChange={(event) => update("productName", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-category">Category</Label>
                <Select
                  value={form.category ?? "none"}
                  onValueChange={(value) => update("category", (value === "none" ? undefined : value) as JewelryCategory | undefined)}
                >
                  <SelectTrigger id="jewelry-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {JEWELRY_CATEGORIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-status">Status</Label>
                <Select value={form.status} onValueChange={(value) => update("status", value as JewelryStatus)}>
                  <SelectTrigger id="jewelry-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JEWELRY_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {JEWELRY_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Material Detail</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-metal">Metal</Label>
                <Input id="jewelry-metal" value={form.metal} onChange={(event) => update("metal", event.target.value)} placeholder="Gold, Silver..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-metal-purity">Metal Purity</Label>
                <Input id="jewelry-metal-purity" value={form.metalPurity} onChange={(event) => update("metalPurity", event.target.value)} placeholder="18K, 22K..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-diamond-type">Diamond Type</Label>
                <Input id="jewelry-diamond-type" value={form.diamondType} onChange={(event) => update("diamondType", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-diamond-weight">Diamond Weight (ct)</Label>
                <Input
                  id="jewelry-diamond-weight"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.diamondWeight ?? ""}
                  onChange={(event) => update("diamondWeight", event.target.value === "" ? undefined : Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-gross-weight">Gross Weight (g)</Label>
                <Input
                  id="jewelry-gross-weight"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.grossWeight ?? ""}
                  onChange={(event) => update("grossWeight", event.target.value === "" ? undefined : Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-net-weight">Net Weight (g)</Label>
                <Input
                  id="jewelry-net-weight"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.netWeight ?? ""}
                  onChange={(event) => update("netWeight", event.target.value === "" ? undefined : Number(event.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Stock & Pricing</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-cost">Cost</Label>
                <Input id="jewelry-cost" type="number" min={0} step="0.01" value={form.cost} onChange={(event) => update("cost", Number(event.target.value))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-selling-price">Selling Price</Label>
                <Input
                  id="jewelry-selling-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(event) => update("sellingPrice", Number(event.target.value))}
                />
              </div>
              {!isEdit && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jewelry-current-stock">Quantity</Label>
                  <Input
                    id="jewelry-current-stock"
                    type="number"
                    min={0}
                    value={form.currentStock}
                    onChange={(event) => update("currentStock", Number(event.target.value))}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-reorder-level">Reorder Level</Label>
                <Input
                  id="jewelry-reorder-level"
                  type="number"
                  min={0}
                  value={form.reorderLevel}
                  onChange={(event) => update("reorderLevel", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-location">Location</Label>
                <Input id="jewelry-location" value={form.location} onChange={(event) => update("location", event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jewelry-supplier">Supplier</Label>
                <Select
                  value={form.supplierId || "none"}
                  onValueChange={(value) => update("supplierId", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="jewelry-supplier">
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
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                To change quantity after creation, use &quot;Adjust Stock&quot; on the item&apos;s detail page - it keeps a full history.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</h3>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional notes about this piece..."
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Images</h3>
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
                    <button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            {isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
