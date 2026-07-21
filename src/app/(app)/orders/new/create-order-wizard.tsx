"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/shared/section-card"
import { createOrder } from "@/app/actions/orders"
import {
  JEWELRY_TYPES,
  METALS,
  METAL_PURITIES,
  STONE_SHAPES,
  STONE_TYPES,
} from "@/types/order"
import type { CustomerOption } from "@/types/order"
import type { CreateOrderInput } from "@/lib/validations/order"

const STEPS = ["Customer", "Order Information", "Order Items", "Review"] as const

interface ItemRow {
  key: string
  description: string
  jewelry_type: string
  metal: string
  metal_purity: string
  stone_type: string
  stone_shape: string
  stone_size: string
  quantity: string
  unit_price: string
  ring_size: string
  engraving: string
}

function createEmptyItem(): ItemRow {
  return {
    key: crypto.randomUUID(),
    description: "",
    jewelry_type: "",
    metal: "",
    metal_purity: "",
    stone_type: "",
    stone_shape: "",
    stone_size: "",
    quantity: "1",
    unit_price: "0",
    ring_size: "",
    engraving: "",
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface CreateOrderWizardProps {
  customers: CustomerOption[]
}

export function CreateOrderWizard({ customers }: CreateOrderWizardProps) {
  const [step, setStep] = useState(0)
  const [customerId, setCustomerId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ItemRow[]>([createEmptyItem()])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateItem(key: string, field: keyof ItemRow, value: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()])
  }

  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current))
  }

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null

  const itemsAreValid = items.every(
    (item) => item.description.trim() !== "" && Number(item.quantity) > 0 && Number(item.unit_price) >= 0
  )

  const canProceed = step === 0 ? customerId !== "" : step === 2 ? itemsAreValid : true

  const subtotalPreview = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  )

  function handleSubmit() {
    setError(null)

    const payload: CreateOrderInput = {
      customer_id: customerId,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        description: item.description,
        jewelry_type: item.jewelry_type || undefined,
        metal: item.metal || undefined,
        metal_purity: item.metal_purity || undefined,
        stone_type: item.stone_type || undefined,
        stone_shape: item.stone_shape || undefined,
        stone_size: item.stone_size || undefined,
        ring_size: item.ring_size || undefined,
        engraving: item.engraving || undefined,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    }

    startTransition(async () => {
      const result = await createOrder(payload)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                index === step
                  ? "border-primary bg-primary/10 text-primary"
                  : index < step
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-border text-muted-foreground/60"
              )}
            >
              <span>{index + 1}</span>
              <span>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="h-px w-4 bg-border" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <SectionCard title="Customer" description="Select the customer this order is for.">
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
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
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="Order Information" description="Due date and any notes for this order.">
          <div className="flex flex-col gap-4 sm:max-w-sm">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due-date">Due Date</Label>
              <Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                placeholder="Optional notes about this order..."
              />
            </div>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard
          title="Order Items"
          description="Add each piece included in this order."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="size-3.5" data-icon="inline-start" />
              Add Item
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <div key={item.key} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Item {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.key)}
                    disabled={items.length === 1}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Product Name" required>
                    <Input
                      value={item.description}
                      onChange={(event) => updateItem(item.key, "description", event.target.value)}
                    />
                  </Field>

                  <Field label="Jewelry Type">
                    <select
                      value={item.jewelry_type}
                      onChange={(event) => updateItem(item.key, "jewelry_type", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select...</option>
                      {JEWELRY_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Metal">
                    <select
                      value={item.metal}
                      onChange={(event) => updateItem(item.key, "metal", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select...</option>
                      {METALS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Metal Purity">
                    <select
                      value={item.metal_purity}
                      onChange={(event) => updateItem(item.key, "metal_purity", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select...</option>
                      {METAL_PURITIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Stone Type">
                    <select
                      value={item.stone_type}
                      onChange={(event) => updateItem(item.key, "stone_type", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select...</option>
                      {STONE_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Stone Shape">
                    <select
                      value={item.stone_shape}
                      onChange={(event) => updateItem(item.key, "stone_shape", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select...</option>
                      {STONE_SHAPES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Stone Size">
                    <Input
                      value={item.stone_size}
                      onChange={(event) => updateItem(item.key, "stone_size", event.target.value)}
                      placeholder="e.g. 1.5ct"
                    />
                  </Field>

                  <Field label="Quantity" required>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, "quantity", event.target.value)}
                    />
                  </Field>

                  <Field label="Unit Price" required>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price}
                      onChange={(event) => updateItem(item.key, "unit_price", event.target.value)}
                    />
                  </Field>

                  <Field label="Ring Size">
                    <Input
                      value={item.ring_size}
                      onChange={(event) => updateItem(item.key, "ring_size", event.target.value)}
                    />
                  </Field>

                  <Field label="Engraving">
                    <Input
                      value={item.engraving}
                      onChange={(event) => updateItem(item.key, "engraving", event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <SectionCard title="Customer">
            <p className="text-sm text-foreground">
              {selectedCustomer?.full_name}
              {selectedCustomer?.company_name ? ` (${selectedCustomer.company_name})` : ""}
            </p>
          </SectionCard>

          <SectionCard title="Order Information">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Due Date</dt>
                <dd className="text-sm text-foreground">{dueDate || "Not set"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
                <dd className="text-sm text-foreground">{notes || "—"}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Order Items">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-foreground">{item.description || "—"}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {formatCurrency(Number(item.unit_price) || 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 pt-3 text-sm font-semibold text-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalPreview)}</span>
            </div>
          </SectionCard>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || isPending}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((current) => current + 1)} disabled={!canProceed}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating order..." : "Create Order"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
