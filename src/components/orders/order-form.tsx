"use client"

import { useState, useTransition } from "react"
import { FileText, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/shared/section-card"
import { createClient } from "@/lib/supabase/client"
import { createOrder, updateOrder } from "@/app/actions/orders"
import { quickAddCustomer } from "@/app/actions/customers"
import { formatFileSize } from "@/types/document"
import { ALLOWED_ORDER_FILE_MIME_TYPES, MAX_ORDER_FILE_SIZE_BYTES } from "@/types/order"
import type { AllowedOrderFileMimeType, CustomerOption, OrderDetail } from "@/types/order"
import type { OrderFormInput } from "@/lib/validations/order"

const ORDER_FILES_BUCKET = "documents"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface FileRow {
  key: string
  id?: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  previewUrl: string | null
  isUploading: boolean
  error?: string
}

type OrderFormProps = {
  customers: CustomerOption[]
} & ({ mode: "create"; order?: undefined } | { mode: "edit"; order: OrderDetail })

export function OrderForm({ mode, order, customers: initialCustomers }: OrderFormProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [customerId, setCustomerId] = useState(order?.customer_id ?? "")
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [isAddingCustomerPending, startAddingCustomerTransition] = useTransition()

  const [productName, setProductName] = useState(order?.productName ?? "")
  const [dueDate, setDueDate] = useState(order?.due_date ?? "")
  const [notes, setNotes] = useState(order?.notes ?? "")
  const [files, setFiles] = useState<FileRow[]>(
    order
      ? order.files.map((file) => ({
          key: crypto.randomUUID(),
          id: file.id,
          file_name: file.file_name,
          file_url: "",
          file_type: file.file_type,
          file_size: file.file_size,
          previewUrl: file.signedUrl,
          isUploading: false,
        }))
      : []
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function removeFile(key: string) {
    setFiles((current) => current.filter((file) => file.key !== key))
  }

  async function handleFileSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    const selected = Array.from(fileList)
    const supabase = createClient()

    const pendingRows: FileRow[] = selected.map((file) => ({
      key: crypto.randomUUID(),
      file_name: file.name,
      file_url: "",
      file_type: file.type,
      file_size: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      isUploading: true,
    }))

    setFiles((current) => [...current, ...pendingRows])

    await Promise.all(
      selected.map(async (file, index) => {
        const row = pendingRows[index]

        if (file.size > MAX_ORDER_FILE_SIZE_BYTES) {
          setFiles((current) => current.map((f) => (f.key === row.key ? { ...f, isUploading: false, error: "File must be 25 MB or smaller." } : f)))
          return
        }

        if (!ALLOWED_ORDER_FILE_MIME_TYPES.includes(file.type as (typeof ALLOWED_ORDER_FILE_MIME_TYPES)[number])) {
          setFiles((current) => current.map((f) => (f.key === row.key ? { ...f, isUploading: false, error: "Unsupported file type." } : f)))
          return
        }

        const path = `order-files/${crypto.randomUUID()}/${file.name}`

        // Direct client-to-Storage upload (same technique as Documents' upload
        // dialog) - the browser client carries the same session JWT the
        // server uses, so Storage RLS still authenticates this upload.
        const { error: uploadError } = await supabase.storage.from(ORDER_FILES_BUCKET).upload(path, file, {
          contentType: file.type,
        })

        if (uploadError) {
          setFiles((current) => current.map((f) => (f.key === row.key ? { ...f, isUploading: false, error: uploadError.message } : f)))
          return
        }

        setFiles((current) => current.map((f) => (f.key === row.key ? { ...f, isUploading: false, file_url: path } : f)))
      })
    )
  }

  function handleAddCustomer() {
    setCustomerError(null)
    startAddingCustomerTransition(async () => {
      const result = await quickAddCustomer({
        full_name: newCustomerName,
        email: newCustomerEmail || undefined,
        phone: newCustomerPhone || undefined,
        address_line1: newCustomerAddress || undefined,
      })

      if (result.error || !result.customer) {
        setCustomerError(result.error ?? "Unable to create customer.")
        return
      }

      setCustomers((current) => [...current, result.customer!])
      setCustomerId(result.customer.id)
      setIsAddingCustomer(false)
      setNewCustomerName("")
      setNewCustomerEmail("")
      setNewCustomerPhone("")
      setNewCustomerAddress("")
    })
  }

  const filesAreReady = files.every((file) => !file.isUploading)
  const canSubmit = customerId !== "" && productName.trim() !== "" && filesAreReady

  function handleSubmit() {
    setError(null)

    const payload: OrderFormInput = {
      customer_id: customerId,
      product_name: productName,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      files: files
        .filter((file) => !file.error)
        .map((file) => ({
          id: file.id,
          file_name: file.file_name,
          // Existing (already-saved) files carry no file_url from the
          // client - the server only needs their id to know they're kept.
          file_url: file.file_url || undefined,
          file_type: file.file_type as AllowedOrderFileMimeType,
          file_size: file.file_size,
        })),
    }

    startTransition(async () => {
      const result = mode === "create" ? await createOrder(payload) : await updateOrder(order.id, payload)

      // On success the action redirects server-side, so we only ever reach
      // here when it failed.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Customer" description="Select the customer this order is for, or create a new one.">
        <div className="flex flex-col gap-4 sm:max-w-sm">
          {!isAddingCustomer ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer">Customer</Label>
                <select
                  id="customer"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                      {customer.company_name ? ` (${customer.company_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingCustomer(true)} className="self-start">
                <Plus className="size-3.5" data-icon="inline-start" />
                Create New Customer
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-customer-name">
                  Full Name<span className="text-destructive">*</span>
                </Label>
                <Input id="new-customer-name" value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-customer-email">Email</Label>
                <Input
                  id="new-customer-email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(event) => setNewCustomerEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-customer-phone">Phone</Label>
                <Input id="new-customer-phone" value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-customer-address">Address</Label>
                <textarea
                  id="new-customer-address"
                  value={newCustomerAddress}
                  onChange={(event) => setNewCustomerAddress(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  placeholder="Street, City, State, ZIP, Country"
                />
              </div>
              {customerError && <p className="text-sm text-destructive">{customerError}</p>}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomer}
                  disabled={isAddingCustomerPending || newCustomerName.trim() === ""}
                >
                  {isAddingCustomerPending ? "Creating..." : "Create Customer"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingCustomer(false)} disabled={isAddingCustomerPending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Product">
        <div className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">
              Product Name<span className="text-destructive">*</span>
            </Label>
            <Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due-date">Due Date</Label>
            <Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Reference Images & Files"
        description="Upload reference images or documents for this order (JPG, PNG, WEBP, PDF - up to 25 MB each)."
      >
        <div className="flex flex-col gap-4">
          <Input
            type="file"
            multiple
            accept={ALLOWED_ORDER_FILE_MIME_TYPES.join(",")}
            onChange={(event) => {
              void handleFileSelect(event.target.files)
              event.target.value = ""
            }}
          />

          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((file) => (
                <div key={file.key} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {file.isUploading ? (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    ) : file.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.previewUrl} alt={file.file_name} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-foreground" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                  {file.error && <p className="text-xs text-destructive">{file.error}</p>}
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(file.key)} disabled={file.isUploading}>
                    <Trash2 className="size-3.5" data-icon="inline-start" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Order Requirements"
        description="Design details, metal preferences, sizing, engraving requests, and any other instructions."
      >
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={8}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          placeholder="Describe what the customer wants..."
        />
      </SectionCard>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isPending || !canSubmit}>
          {isPending ? "Saving..." : mode === "create" ? "Create Order" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
