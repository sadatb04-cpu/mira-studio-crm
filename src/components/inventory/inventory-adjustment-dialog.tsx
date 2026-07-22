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
import { adjustInventory, consumeInventory } from "@/app/actions/inventory"
import type { InventoryItemOption } from "@/types/inventory"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface InventoryAdjustmentDialogProps {
  mode: "adjust" | "consume"
  trigger: React.ReactNode
  /** Required for mode="adjust" - the item is fixed (this page's item). */
  item?: { id: string; name: string; unit: string }
  /** Required for mode="consume" - the user picks which item was used. */
  items?: InventoryItemOption[]
  /** Required for mode="consume" - the production job this consumption belongs to. */
  productionJobId?: string
}

export function InventoryAdjustmentDialog({
  mode,
  trigger,
  item,
  items = [],
  productionJobId,
}: InventoryAdjustmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState("")
  const [direction, setDirection] = useState<"increase" | "decrease">("increase")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setSelectedItemId("")
    setDirection("increase")
    setQuantity("")
    setNotes("")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function handleSubmit() {
    setError(null)

    startTransition(async () => {
      const result =
        mode === "consume"
          ? await consumeInventory({
              inventory_item_id: selectedItemId,
              quantity: Number(quantity),
              notes: notes || undefined,
              production_job_id: productionJobId ?? "",
            })
          : await adjustInventory({
              inventory_item_id: item?.id ?? "",
              quantity: Number(quantity),
              direction,
              notes: notes || undefined,
            })

      if (result?.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const title = mode === "consume" ? "Consume Inventory" : "Adjust Stock"
  const description =
    mode === "consume"
      ? "Record raw materials or components used for this production job."
      : `Record a stock increase or decrease for ${item?.name ?? "this item"}.`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode === "consume" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-item">Inventory Item</Label>
              <select
                id="inventory-item"
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Select an item...</option>
                {items.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "adjust" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direction">Direction</Label>
              <select
                id="direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value as "increase" | "decrease")}
                className={selectClassName}
              >
                <option value="increase">Increase Stock</option>
                <option value="decrease">Decrease Stock</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity{item?.unit ? ` (${item.unit})` : ""}</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional notes..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "consume" ? "Record Consumption" : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
