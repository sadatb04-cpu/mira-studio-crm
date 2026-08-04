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
import { createSeller, updateSeller } from "@/app/actions/finance-sellers"

interface SellerFormDialogProps {
  mode: "create" | "rename"
  sellerId?: string
  initialName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SellerFormDialog({ mode, sellerId, initialName = "", open: openProp, onOpenChange }: SellerFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = onOpenChange !== undefined
  const open = isControlled ? (openProp ?? false) : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setName(initialName)
      setError(null)
    }
  }

  function handleSubmit() {
    setError(null)

    if (name.trim() === "") {
      setError("Seller name is required.")
      return
    }

    startTransition(async () => {
      const result = mode === "create" ? await createSeller({ name }) : await updateSeller(sellerId as string, { name })

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
            New Seller
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Seller" : "Rename Seller"}</DialogTitle>
          <DialogDescription>{mode === "create" ? "Add a seller to start recording sales invoices for them." : "Update this seller's name."}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller-name">
              Seller Name<span className="text-destructive">*</span>
            </Label>
            <Input id="seller-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Seller A" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
