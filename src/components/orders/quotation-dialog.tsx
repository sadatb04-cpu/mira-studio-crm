"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createQuotation, updateQuotation } from "@/app/actions/quotations"
import { QUOTATION_COST_FIELDS } from "@/types/quotation"
import type { Quotation, QuotationCostBreakdown } from "@/types/quotation"

type CostFormState = Record<keyof QuotationCostBreakdown, string>

function emptyCostState(): CostFormState {
  return {
    metal_cost: "",
    stone_cost: "",
    labor_cost: "",
    cad_cost: "",
    setting_cost: "",
    certification_cost: "",
    hallmark_cost: "",
    packaging_cost: "",
    shipping_cost: "",
    other_charges: "",
    discount: "",
  }
}

function costStateFromQuotation(quotation: Quotation): CostFormState {
  return {
    metal_cost: quotation.metal_cost ? String(quotation.metal_cost) : "",
    stone_cost: quotation.stone_cost ? String(quotation.stone_cost) : "",
    labor_cost: quotation.labor_cost ? String(quotation.labor_cost) : "",
    cad_cost: quotation.cad_cost ? String(quotation.cad_cost) : "",
    setting_cost: quotation.setting_cost ? String(quotation.setting_cost) : "",
    certification_cost: quotation.certification_cost ? String(quotation.certification_cost) : "",
    hallmark_cost: quotation.hallmark_cost ? String(quotation.hallmark_cost) : "",
    packaging_cost: quotation.packaging_cost ? String(quotation.packaging_cost) : "",
    shipping_cost: quotation.shipping_cost ? String(quotation.shipping_cost) : "",
    other_charges: quotation.other_charges ? String(quotation.other_charges) : "",
    discount: quotation.discount ? String(quotation.discount) : "",
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

type QuotationDialogProps = {
  orderId: string
  trigger: React.ReactNode
} & ({ mode: "create"; quotation?: undefined } | { mode: "edit"; quotation: Quotation })

export function QuotationDialog({ orderId, trigger, mode, quotation }: QuotationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [quoteName, setQuoteName] = useState(quotation?.quote_name ?? "")
  const [costs, setCosts] = useState<CostFormState>(quotation ? costStateFromQuotation(quotation) : emptyCostState())
  const [notes, setNotes] = useState(quotation?.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateCost(key: keyof QuotationCostBreakdown, value: string) {
    setCosts((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setQuoteName(quotation?.quote_name ?? "")
    setCosts(quotation ? costStateFromQuotation(quotation) : emptyCostState())
    setNotes(quotation?.notes ?? "")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  const grandTotalPreview =
    QUOTATION_COST_FIELDS.reduce((sum, field) => sum + (Number(costs[field.key]) || 0), 0) - (Number(costs.discount) || 0)

  function handleSubmit() {
    setError(null)

    const payload = {
      quote_name: quoteName,
      metal_cost: Number(costs.metal_cost) || 0,
      stone_cost: Number(costs.stone_cost) || 0,
      labor_cost: Number(costs.labor_cost) || 0,
      cad_cost: Number(costs.cad_cost) || 0,
      setting_cost: Number(costs.setting_cost) || 0,
      certification_cost: Number(costs.certification_cost) || 0,
      hallmark_cost: Number(costs.hallmark_cost) || 0,
      packaging_cost: Number(costs.packaging_cost) || 0,
      shipping_cost: Number(costs.shipping_cost) || 0,
      other_charges: Number(costs.other_charges) || 0,
      discount: Number(costs.discount) || 0,
      notes: notes || undefined,
    }

    startTransition(async () => {
      const result =
        mode === "create" ? await createQuotation(orderId, payload) : await updateQuotation(orderId, quotation.id, payload)

      if (result?.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Give Pricing" : "Edit Quotation"}</DialogTitle>
          <DialogDescription>
            Only Quote Name is required - every cost field is optional and blank counts as zero.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote-name">
              Quote Name<span className="text-destructive">*</span>
            </Label>
            <Input
              id="quote-name"
              value={quoteName}
              onChange={(event) => setQuoteName(event.target.value)}
              placeholder="e.g. 18K Yellow Gold"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUOTATION_COST_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  min={0}
                  step="0.01"
                  value={costs[field.key]}
                  onChange={(event) => updateCost(field.key, event.target.value)}
                  placeholder="0"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step="0.01"
                value={costs.discount}
                onChange={(event) => updateCost("discount", event.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quotation-notes">Notes</Label>
            <textarea
              id="quotation-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional notes about this quotation..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold text-foreground">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotalPreview)}</span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending || quoteName.trim() === ""}>
            {isPending ? "Saving..." : mode === "create" ? "Create Quotation" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
