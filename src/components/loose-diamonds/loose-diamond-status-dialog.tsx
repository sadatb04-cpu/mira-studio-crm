"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateLooseDiamondStatusAction } from "@/app/actions/loose-diamonds"
import { LOOSE_DIAMOND_STATUSES, LOOSE_DIAMOND_STATUS_LABELS } from "@/types/loose-diamond"
import type { LooseDiamondStatus } from "@/types/loose-diamond"

interface LooseDiamondStatusDialogProps {
  looseDiamondId: string
  currentStatus: LooseDiamondStatus
}

export function LooseDiamondStatusDialog({ looseDiamondId, currentStatus }: LooseDiamondStatusDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<LooseDiamondStatus>(currentStatus)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function handleSubmit() {
    setError(null)
    setIsSaving(true)

    void (async () => {
      const result = await updateLooseDiamondStatusAction({ looseDiamondId, previousStatus: currentStatus, newStatus, notes })
      setIsSaving(false)

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      setNotes("")
      router.refresh()
    })()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setNewStatus(currentStatus)
          setNotes("")
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Update Status
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>Every status change is recorded as a stock movement.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as LooseDiamondStatus)}>
              <SelectTrigger id="new-status">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status-notes">Notes</Label>
            <textarea
              id="status-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional - e.g. buyer name, memo recipient..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving} disabled={newStatus === currentStatus}>
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
