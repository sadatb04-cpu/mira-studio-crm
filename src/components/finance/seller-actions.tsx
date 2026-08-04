"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { SellerFormDialog } from "@/components/finance/seller-form-dialog"
import { useCanAccess } from "@/components/providers/permissions-provider"
import { deleteSeller } from "@/app/actions/finance-sellers"

interface SellerActionsProps {
  sellerId: string
  sellerName: string
}

export function SellerActions({ sellerId, sellerName }: SellerActionsProps) {
  const router = useRouter()
  const canEdit = useCanAccess("finance", "edit")
  const canDelete = useCanAccess("finance", "delete")
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  function handleDelete() {
    setError(null)
    startDelete(async () => {
      const result = await deleteSeller(sellerId)
      if (result.error) {
        setError(result.error)
        return
      }
      setConfirmOpen(false)
      router.push("/finance/sellers")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
            <Pencil className="size-3.5" data-icon="inline-start" />
            Rename
          </Button>
        )}
        {canDelete && (
          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Trash2 className="size-3.5" data-icon="inline-start" />}
            Delete
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <SellerFormDialog mode="rename" sellerId={sellerId} initialName={sellerName} open={renameOpen} onOpenChange={setRenameOpen} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete seller"
        description={`Are you sure you want to delete "${sellerName}"? All of its invoices will be deleted too. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
