"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  FINANCE_EXPENSES_PAGE_SIZE,
  createExpense as createExpenseQuery,
  deleteExpense as deleteExpenseQuery,
  getExpenses,
  updateExpense as updateExpenseQuery,
} from "@/lib/supabase/finance-expenses"
import { financeExpenseSchema } from "@/lib/validations/finance"
import type { FinanceExpenseInput } from "@/lib/validations/finance"
import type { FinanceExpenseCategory, FinanceExpenseListItem } from "@/types/finance"

export interface FinanceActionState {
  error?: string
}

export async function createExpense(input: FinanceExpenseInput): Promise<FinanceActionState & { id?: string }> {
  const validated = financeExpenseSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  let id: string
  try {
    await requireModulePermission(supabase, "finance", "create")
    id = await createExpenseQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save expense." }
  }

  revalidatePath("/finance/expenses")
  return { id }
}

export async function updateExpense(id: string, input: FinanceExpenseInput): Promise<FinanceActionState> {
  const validated = financeExpenseSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "edit")
    await updateExpenseQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update expense." }
  }

  revalidatePath("/finance/expenses")
  return {}
}

export async function deleteExpense(id: string): Promise<FinanceActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "delete")
    await deleteExpenseQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete expense." }
  }

  revalidatePath("/finance/expenses")
  return {}
}

export interface LoadMoreExpensesResult {
  expenses: FinanceExpenseListItem[]
  hasMore: boolean
}

export async function loadMoreExpenses(
  filters: { category?: FinanceExpenseCategory; expenseDateAfter?: string },
  offset: number
): Promise<LoadMoreExpensesResult> {
  const supabase = await createClient()
  return getExpenses(supabase, { ...filters, offset, limit: FINANCE_EXPENSES_PAGE_SIZE })
}
