"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Pencil, Trash2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { QuotationDialog } from "@/components/orders/quotation-dialog"
import { QuotationStatusBadge } from "@/components/orders/quotation-status-badge"
import { deleteQuotation, duplicateQuotation, updateQuotationStatus } from "@/app/actions/quotations"
import { QUOTATION_COST_FIELDS, QUOTATION_STATUSES, QUOTATION_STATUS_LABELS } from "@/types/quotation"
import type { Quotation, QuotationStatus } from "@/types/quotation"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface QuotationCardProps {
  orderId: string
  quotation: Quotation
}

export function QuotationCard({ orderId, quotation }: QuotationCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<QuotationStatus>(quotation.status)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isDuplicatePending, startDuplicateTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const activeCostFields = QUOTATION_COST_FIELDS.filter((field) => quotation[field.key] > 0)

  function handleStatusUpdate() {
    setError(null)
    startStatusTransition(async () => {
      const result = await updateQuotationStatus(orderId, quotation.id, status)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDuplicate() {
    setError(null)
    startDuplicateTransition(async () => {
      const result = await duplicateQuotation(orderId, quotation.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    setError(null)
    startDeleteTransition(async () => {
      const result = await deleteQuotation(orderId, quotation.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setConfirmDeleteOpen(false)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{quotation.quote_name}</CardTitle>
          <QuotationStatusBadge status={quotation.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-lg font-semibold text-foreground">{formatCurrency(quotation.grand_total)}</span>
        </div>

        {activeCostFields.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {activeCostFields.map((field) => (
              <div key={field.key}>
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(quotation[field.key])}</dd>
              </div>
            ))}
            {quotation.discount > 0 && (
              <div>
                <dt className="text-xs text-muted-foreground">Discount</dt>
                <dd className="font-medium text-destructive">-{formatCurrency(quotation.discount)}</dd>
              </div>
            )}
          </dl>
        )}

        {quotation.notes && <p className="text-sm text-muted-foreground">{quotation.notes}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Select value={status} onValueChange={(value) => setStatus(value as QuotationStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUOTATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {QUOTATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={handleStatusUpdate} disabled={isStatusPending || status === quotation.status}>
            {isStatusPending ? "Updating..." : "Update Status"}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <QuotationDialog
              orderId={orderId}
              mode="edit"
              quotation={quotation}
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit quotation">
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleDuplicate} disabled={isDuplicatePending} aria-label="Duplicate quotation">
              <Copy className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setConfirmDeleteOpen(true)} aria-label="Delete quotation">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete quotation"
        description={`Are you sure you want to delete "${quotation.quote_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isDeletePending}
      />
    </Card>
  )
}
