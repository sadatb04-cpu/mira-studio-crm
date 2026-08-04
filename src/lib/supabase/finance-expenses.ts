import type { SupabaseClient } from "@supabase/supabase-js"

import type { FinanceExpenseCategory, FinanceExpenseListItem } from "@/types/finance"
import type { FinanceExpenseInput } from "@/lib/validations/finance"

const BUCKET = "documents"
export const FINANCE_EXPENSES_PAGE_SIZE = 20

async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "finance_expense",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

interface GetExpensesFilters {
  category?: FinanceExpenseCategory
  expenseDateAfter?: string
  offset?: number
  limit?: number
}

export async function getExpenses(
  supabase: SupabaseClient,
  filters: GetExpensesFilters = {}
): Promise<{ expenses: FinanceExpenseListItem[]; hasMore: boolean }> {
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? FINANCE_EXPENSES_PAGE_SIZE

  let query = supabase
    .from("finance_expenses")
    .select("id, category, amount, expense_date, notes, file_name, file_size, mime_type, file_url, google_sheet_url, created_at")
    .order("expense_date", { ascending: false })
    .range(offset, offset + limit)

  if (filters.category) query = query.eq("category", filters.category)
  if (filters.expenseDateAfter) query = query.gte("expense_date", filters.expenseDateAfter)

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = rows.length > limit

  return { expenses: rows.slice(0, limit), hasMore }
}

export async function createExpense(supabase: SupabaseClient, input: FinanceExpenseInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("finance_expenses")
    .insert({
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      notes: input.notes || null,
      file_name: input.fileName || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType || null,
      file_url: input.storagePath || null,
      google_sheet_url: input.googleSheetUrl || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    if (input.storagePath) await supabase.storage.from(BUCKET).remove([input.storagePath])
    throw error
  }

  const id = data.id as string
  await logActivity(supabase, { entity_id: id, action: "expense_created", description: `Added a ${input.category} expense.` })
  return id
}

export async function updateExpense(supabase: SupabaseClient, id: string, input: FinanceExpenseInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase.from("finance_expenses").select("file_url").eq("id", id).maybeSingle()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("finance_expenses")
    .update({
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      notes: input.notes || null,
      file_name: input.fileName || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType || null,
      file_url: input.storagePath || null,
      google_sheet_url: input.googleSheetUrl || null,
    })
    .eq("id", id)

  if (error) throw error

  if (existing?.file_url && input.storagePath && existing.file_url !== input.storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.file_url])
  }

  await logActivity(supabase, { entity_id: id, action: "expense_updated", description: `Updated a ${input.category} expense.` })
}

export async function deleteExpense(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: expense, error: fetchError } = await supabase.from("finance_expenses").select("category, file_url").eq("id", id).maybeSingle()
  if (fetchError) throw fetchError
  if (!expense) return

  const { error } = await supabase.from("finance_expenses").delete().eq("id", id)
  if (error) throw error

  if (expense.file_url) {
    await supabase.storage.from(BUCKET).remove([expense.file_url])
  }

  await logActivity(supabase, { entity_id: id, action: "expense_deleted", description: `Deleted a ${expense.category} expense.` })
}

export async function getFinanceExpensesThisMonthTotal(supabase: SupabaseClient): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const { data, error } = await supabase.from("finance_expenses").select("amount").gte("expense_date", startOfMonth)
  if (error) throw error

  return (data ?? []).reduce((sum, row) => sum + row.amount, 0)
}
