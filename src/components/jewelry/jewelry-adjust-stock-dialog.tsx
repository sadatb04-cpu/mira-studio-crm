"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { adjustJewelryStock } from "@/app/actions/jewelry"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface JewelryAdjustStockDialogProps {
  jewelryItemId: string
}

export function JewelryAdjustStockDialog({ jewelryItemId }: JewelryAdjustStockDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<"increase" | "decrease">("increase")
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function reset() {
    setDirection("increase")
    setQuantity(1)
    setNotes("")
    setError(null)
  }

  function handleSubmit() {
    setError(null)

    if (quantity <= 0) {
      setError("Quantity must be greater than 0.")
      return
    }

    setIsSaving(true)

    void (async () => {
      const result = await adjustJewelryStock({ jewelryItemId, quantity, direction, notes })
      setIsSaving(false)

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Adjust Stock
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>Every adjustment is recorded as a stock movement.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-direction">Direction</Label>
            <select
              id="adjust-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as "increase" | "decrease")}
              className={selectClassName}
            >
              <option value="increase">Increase (Purchase / Return)</option>
              <option value="decrease">Decrease (Sale / Adjustment)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-quantity">Quantity</Label>
            <Input id="adjust-quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-notes">Notes</Label>
            <textarea
              id="adjust-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional - reason for this adjustment..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            Save Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
