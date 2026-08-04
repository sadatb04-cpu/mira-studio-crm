"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FinanceAttachmentField } from "@/components/finance/finance-attachment-field"
import { uploadFinanceFile } from "@/lib/supabase/finance-upload"
import { createExpense, updateExpense } from "@/app/actions/finance-expenses"
import {
  ALLOWED_FINANCE_MIME_TYPES,
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_EXPENSE_CATEGORY_LABELS,
  MAX_FINANCE_FILE_SIZE_BYTES,
} from "@/types/finance"
import type { FinanceExpenseCategory, FinanceExpenseListItem } from "@/types/finance"

interface ExpenseFormDialogProps {
  mode: "create" | "edit"
  expense?: FinanceExpenseListItem
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExpenseFormDialog({ mode, expense, open: openProp, onOpenChange }: ExpenseFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = onOpenChange !== undefined
  const open = isControlled ? (openProp ?? false) : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [category, setCategory] = useState<FinanceExpenseCategory>(expense?.category ?? "miscellaneous")
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "")
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date ?? "")
  const [notes, setNotes] = useState(expense?.notes ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState(expense?.google_sheet_url ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCategory(expense?.category ?? "miscellaneous")
      setAmount(expense ? String(expense.amount) : "")
      setExpenseDate(expense?.expense_date ?? "")
      setNotes(expense?.notes ?? "")
      setFile(null)
      setGoogleSheetUrl(expense?.google_sheet_url ?? "")
      setError(null)
    }
  }

  function handleSubmit() {
    setError(null)

    const amountNumber = Number(amount)

    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError("Enter an amount greater than 0.")
      return
    }
    if (!expenseDate) {
      setError("Date is required.")
      return
    }
    if (!file && !googleSheetUrl && !expense?.file_url) {
      setError("Upload a receipt or add a Google Sheets link.")
      return
    }
    if (file && file.size > MAX_FINANCE_FILE_SIZE_BYTES) {
      setError("File must be 25 MB or smaller.")
      return
    }
    if (file && !ALLOWED_FINANCE_MIME_TYPES.includes(file.type as (typeof ALLOWED_FINANCE_MIME_TYPES)[number])) {
      setError("Unsupported file type.")
      return
    }

    startTransition(async () => {
      let storagePath: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined
      let mimeType: (typeof ALLOWED_FINANCE_MIME_TYPES)[number] | undefined

      if (file) {
        setIsUploading(true)
        const uploadResult = await uploadFinanceFile(file)
        setIsUploading(false)

        if (uploadResult.error) {
          setError(uploadResult.error)
          return
        }

        storagePath = uploadResult.storagePath
        fileName = file.name
        fileSize = file.size
        mimeType = file.type as (typeof ALLOWED_FINANCE_MIME_TYPES)[number]
      } else if (!googleSheetUrl && expense?.file_url) {
        storagePath = expense.file_url
        fileName = expense.file_name ?? undefined
        fileSize = expense.file_size ?? undefined
        mimeType = (expense.mime_type ?? undefined) as (typeof ALLOWED_FINANCE_MIME_TYPES)[number] | undefined
      }

      const input = {
        category,
        amount: amountNumber,
        expenseDate,
        notes: notes || undefined,
        fileName,
        fileSize,
        mimeType,
        storagePath,
        googleSheetUrl: googleSheetUrl || undefined,
      }

      const result = mode === "create" ? await createExpense(input) : await updateExpense(expense!.id, input)

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
            Add Expense
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Expense" : "Edit Expense"}</DialogTitle>
          <DialogDescription>Log a company expense not related to manufacturing or sellers.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FinanceAttachmentField
            label="Upload Receipt / Invoice"
            file={file}
            onFileChange={setFile}
            googleSheetUrl={googleSheetUrl}
            onGoogleSheetUrlChange={setGoogleSheetUrl}
            existingFileName={expense?.file_name}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-category">
              Category<span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={(value) => setCategory(value as FinanceExpenseCategory)}>
              <SelectTrigger id="expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCE_EXPENSE_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FINANCE_EXPENSE_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-amount">
                Amount<span className="text-destructive">*</span>
              </Label>
              <Input id="expense-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-date">
                Date<span className="text-destructive">*</span>
              </Label>
              <Input id="expense-date" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-notes">Notes</Label>
            <textarea
              id="expense-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            {isUploading ? "Uploading..." : mode === "create" ? "Add Expense" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
