"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { ExternalLink, File, FileImage, FileSpreadsheet, FileText, Loader2, Pencil, Receipt, Trash2 } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PermissionGate } from "@/components/providers/permission-gate"
import { ExpenseFormDialog } from "@/components/finance/expense-form-dialog"
import { deleteExpense, loadMoreExpenses } from "@/app/actions/finance-expenses"
import { getFinanceAttachmentUrl } from "@/app/actions/finance-attachments"
import { formatFileSize } from "@/types/document"
import { FINANCE_EXPENSE_CATEGORY_LABELS } from "@/types/finance"
import type { FinanceExpenseCategory, FinanceExpenseListItem } from "@/types/finance"

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

interface ExpenseTableProps {
  expenses: FinanceExpenseListItem[]
  hasMore?: boolean
  category?: FinanceExpenseCategory
  expenseDateAfter?: string
}

export function ExpenseTable({ expenses: initialExpenses, hasMore: initialHasMore = false, category, expenseDateAfter }: ExpenseTableProps) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<FinanceExpenseListItem | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<FinanceExpenseListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    setIsLoadingMore(true)
    void (async () => {
      const page = await loadMoreExpenses({ category, expenseDateAfter }, expenses.length)
      setExpenses((current) => [...current, ...page.expenses])
      setHasMore(page.hasMore)
      setIsLoadingMore(false)
    })()
  }

  function handleOpenAttachment(expense: FinanceExpenseListItem) {
    if (expense.google_sheet_url) {
      window.open(expense.google_sheet_url, "_blank", "noopener,noreferrer")
      return
    }
    if (!expense.file_url) return

    setOpeningId(expense.id)
    void (async () => {
      const result = await getFinanceAttachmentUrl(expense.file_url as string)
      setOpeningId(null)
      if (result.signedUrl) window.open(result.signedUrl, "_blank", "noopener,noreferrer")
    })()
  }

  function handleDelete() {
    if (!deletingExpense) return
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteExpense(deletingExpense.id)
      if (result.error) {
        setDeleteError(result.error)
        return
      }
      setExpenses((current) => current.filter((expense) => expense.id !== deletingExpense.id))
      setDeletingExpense(null)
    })
  }

  if (expenses.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Receipt} title="No expenses found" description="Try adjusting your filters, or add a new expense." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Receipt</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => handleOpenAttachment(expense)}
                  disabled={openingId === expense.id}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  {openingId === expense.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : expense.google_sheet_url && !expense.file_url ? (
                    <ExternalLink className="size-4 text-muted-foreground" />
                  ) : (
                    <AttachmentIcon mimeType={expense.mime_type} />
                  )}
                  <span className="flex flex-col">
                    <span className="text-foreground">{expense.file_name ?? "Google Sheets Link"}</span>
                    {expense.file_size !== null && <span className="text-xs text-muted-foreground">{formatFileSize(expense.file_size)}</span>}
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <StatusBadge label={FINANCE_EXPENSE_CATEGORY_LABELS[expense.category]} tone="neutral" />
              </TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">{expense.notes ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(expense.expense_date), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right font-medium text-foreground">{formatCurrency(expense.amount)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <PermissionGate module="finance" action="edit">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingExpense(expense)} aria-label="Edit expense">
                      <Pencil className="size-3.5" />
                    </Button>
                  </PermissionGate>
                  <PermissionGate module="finance" action="delete">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeletingExpense(expense)} aria-label="Delete expense">
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

      {editingExpense && (
        <ExpenseFormDialog mode="edit" expense={editingExpense} open={Boolean(editingExpense)} onOpenChange={(next) => !next && setEditingExpense(null)} />
      )}

      <ConfirmDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(next) => {
          if (!next) {
            setDeletingExpense(null)
            setDeleteError(null)
          }
        }}
        title="Delete expense"
        description={deleteError ?? "Are you sure you want to delete this expense? This cannot be undone."}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isConfirming={isPending}
      />
    </SectionCard>
  )
}
