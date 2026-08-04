"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { ExternalLink, File, FileImage, FileSpreadsheet, FileText, Loader2, Pencil, Receipt, Trash2 } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PermissionGate } from "@/components/providers/permission-gate"
import { ManufacturerInvoiceFormDialog } from "@/components/finance/manufacturer-invoice-form-dialog"
import { deleteManufacturerInvoice, loadMoreManufacturerInvoices } from "@/app/actions/finance-manufacturers"
import { getFinanceAttachmentUrl } from "@/app/actions/finance-attachments"
import { formatFileSize } from "@/types/document"
import type { FinanceManufacturerInvoiceListItem } from "@/types/finance"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function AttachmentIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) return <FileImage className="size-4 text-muted-foreground" />
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType === "text/csv")
    return <FileSpreadsheet className="size-4 text-muted-foreground" />
  if (mimeType === "application/pdf" || mimeType?.includes("word")) return <FileText className="size-4 text-muted-foreground" />
  return <File className="size-4 text-muted-foreground" />
}

interface ManufacturerInvoiceTableProps {
  manufacturerId: string
  invoices: FinanceManufacturerInvoiceListItem[]
  hasMore?: boolean
}

export function ManufacturerInvoiceTable({ manufacturerId, invoices: initialInvoices, hasMore: initialHasMore = false }: ManufacturerInvoiceTableProps) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<FinanceManufacturerInvoiceListItem | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<FinanceManufacturerInvoiceListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    setIsLoadingMore(true)
    void (async () => {
      const page = await loadMoreManufacturerInvoices(manufacturerId, invoices.length)
      setInvoices((current) => [...current, ...page.invoices])
      setHasMore(page.hasMore)
      setIsLoadingMore(false)
    })()
  }

  function handleOpenAttachment(invoice: FinanceManufacturerInvoiceListItem) {
    if (invoice.google_sheet_url) {
      window.open(invoice.google_sheet_url, "_blank", "noopener,noreferrer")
      return
    }
    if (!invoice.file_url) return

    setOpeningId(invoice.id)
    void (async () => {
      const result = await getFinanceAttachmentUrl(invoice.file_url as string)
      setOpeningId(null)
      if (result.signedUrl) window.open(result.signedUrl, "_blank", "noopener,noreferrer")
    })()
  }

  function handleDelete() {
    if (!deletingInvoice) return
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteManufacturerInvoice(deletingInvoice.id, manufacturerId)
      if (result.error) {
        setDeleteError(result.error)
        return
      }
      setInvoices((current) => current.filter((invoice) => invoice.id !== deletingInvoice.id))
      setDeletingInvoice(null)
    })
  }

  if (invoices.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Receipt} title="No invoices found" description="Try adjusting your search or filters, or add a new invoice." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Invoice</TableHead>
            <TableHead>Product Type</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Manufacturing Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => handleOpenAttachment(invoice)}
                  disabled={openingId === invoice.id}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  {openingId === invoice.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : invoice.google_sheet_url && !invoice.file_url ? (
                    <ExternalLink className="size-4 text-muted-foreground" />
                  ) : (
                    <AttachmentIcon mimeType={invoice.mime_type} />
                  )}
                  <span className="flex flex-col">
                    <span className="text-foreground">{invoice.file_name ?? "Google Sheets Link"}</span>
                    {invoice.file_size !== null && <span className="text-xs text-muted-foreground">{formatFileSize(invoice.file_size)}</span>}
                  </span>
                </button>
              </TableCell>
              <TableCell className="font-medium text-foreground">{invoice.product_type}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">{invoice.notes ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(invoice.invoice_date), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right font-medium text-foreground">{formatCurrency(invoice.manufacturing_price)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <PermissionGate module="finance" action="edit">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingInvoice(invoice)} aria-label="Edit invoice">
                      <Pencil className="size-3.5" />
                    </Button>
                  </PermissionGate>
                  <PermissionGate module="finance" action="delete">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeletingInvoice(invoice)} aria-label="Delete invoice">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </PermissionGate>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasMore && (
        <div className="flex justify-center border-t border-border p-3">
          <Button type="button" variant="outline" size="sm" loading={isLoadingMore} onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}

      {editingInvoice && (
        <ManufacturerInvoiceFormDialog
          manufacturerId={manufacturerId}
          mode="edit"
          invoice={editingInvoice}
          open={Boolean(editingInvoice)}
          onOpenChange={(next) => !next && setEditingInvoice(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingInvoice)}
        onOpenChange={(next) => {
          if (!next) {
            setDeletingInvoice(null)
            setDeleteError(null)
          }
        }}
        title="Delete invoice"
        description={deleteError ?? `Are you sure you want to delete this ${deletingInvoice?.product_type ?? ""} invoice? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isPending}
      />
    </SectionCard>
  )
}
