"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useCanAccess, useHasSpecialPermission } from "@/components/providers/permissions-provider"
import { updateQuotationStatus } from "@/app/actions/quotations"
import { markOrderDelivered } from "@/app/actions/orders"
import type { OrderStatus } from "@/types/order"
import type { Quotation } from "@/types/quotation"

interface OrderWorkflowActionsProps {
  orderId: string
  status: OrderStatus
  quotations: Quotation[]
}

// Covers the two workflow steps that don't already have a natural home
// elsewhere on the page - Draft's "Give Pricing" lives in the Pricing
// section's own empty state, and Approved's "Release to Production" lives
// in the Production section. Only the single-quotation case gets a direct
// one-click shortcut here; with more than one quotation, which one to send/
// accept is ambiguous, so that's done from each quotation card's own status
// control instead (unchanged from Sprint 4.1.3's quotation system).
export function OrderWorkflowActions({ orderId, status, quotations }: OrderWorkflowActionsProps) {
  const router = useRouter()
  const canSendQuotation = useHasSpecialPermission("send_quotation")
  const canApproveQuotation = useHasSpecialPermission("approve_quotation")
  const canEditQuotation = useCanAccess("quotations", "edit")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleQuotationStatus(quotationId: string, next: "sent" | "accepted" | "rejected") {
    setError(null)
    startTransition(async () => {
      const result = await updateQuotationStatus(orderId, quotationId, next)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleMarkDelivered() {
    setError(null)
    startTransition(async () => {
      const result = await markOrderDelivered(orderId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  let content: React.ReactNode = null

  if (status === "pricing_ready") {
    if (quotations.length === 1 && canSendQuotation) {
      content = (
        <Button type="button" size="sm" onClick={() => handleQuotationStatus(quotations[0].id, "sent")} disabled={isPending}>
          {isPending ? "Sending..." : "Send Quote"}
        </Button>
      )
    } else if (quotations.length > 1) {
      content = (
        <p className="text-sm text-muted-foreground">
          Mark one of the quotations below as Sent to move this order to Awaiting Approval.
        </p>
      )
    }
  } else if (status === "awaiting_approval") {
    const sentQuotation = quotations.find((quotation) => quotation.status === "sent")
    if (sentQuotation) {
      content = (
        <div className="flex items-center gap-2">
          {canApproveQuotation && (
            <Button type="button" size="sm" onClick={() => handleQuotationStatus(sentQuotation.id, "accepted")} disabled={isPending}>
              Customer Approved
            </Button>
          )}
          {canEditQuotation && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => handleQuotationStatus(sentQuotation.id, "rejected")}
              disabled={isPending}
            >
              Customer Rejected
            </Button>
          )}
        </div>
      )
    } else {
      content = (
        <p className="text-sm text-muted-foreground">Mark a quotation below as Sent, Accepted, or Rejected to continue.</p>
      )
    }
  } else if (status === "ready_for_delivery") {
    content = (
      <Button type="button" size="sm" onClick={handleMarkDelivered} disabled={isPending}>
        {isPending ? "Updating..." : "Mark Delivered"}
      </Button>
    )
  }

  if (!content && !error) return null

  return (
    <div className="flex flex-col gap-2">
      {content}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
