"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  FINANCE_INVOICES_PAGE_SIZE,
  createSeller as createSellerQuery,
  createSellerInvoice as createSellerInvoiceQuery,
  deleteSeller as deleteSellerQuery,
  deleteSellerInvoice as deleteSellerInvoiceQuery,
  getSellerInvoices,
  updateSeller as updateSellerQuery,
  updateSellerInvoice as updateSellerInvoiceQuery,
} from "@/lib/supabase/finance-sellers"
import { financeSellerFormSchema, sellerInvoiceSchema } from "@/lib/validations/finance"
import type { FinanceSellerFormInput, SellerInvoiceInput } from "@/lib/validations/finance"
import type { FinanceSellerInvoiceListItem } from "@/types/finance"

export interface FinanceActionState {
  error?: string
}

export async function createSeller(input: FinanceSellerFormInput): Promise<FinanceActionState & { id?: string }> {
  const validated = financeSellerFormSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  let id: string
  try {
    await requireModulePermission(supabase, "finance", "create")
    id = await createSellerQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create seller." }
  }

  revalidatePath("/finance/sellers")
  return { id }
}

export async function updateSeller(id: string, input: FinanceSellerFormInput): Promise<FinanceActionState> {
  const validated = financeSellerFormSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "edit")
    await updateSellerQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update seller." }
  }

  revalidatePath("/finance/sellers")
  revalidatePath(`/finance/sellers/${id}`)
  return {}
}

export async function deleteSeller(id: string): Promise<FinanceActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "delete")
    await deleteSellerQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete seller." }
  }

  revalidatePath("/finance/sellers")
  // Cascades that seller's invoices too (see migration 0024's ON DELETE
  // CASCADE), which changes Revenue/COGS/Gross Profit - see the comment on
  // createSellerInvoice below for why Dashboard/Reports need an explicit
  // revalidatePath here.
  revalidatePath("/")
  revalidatePath("/reports")
  return {}
}

export async function createSellerInvoice(input: SellerInvoiceInput): Promise<FinanceActionState & { id?: string }> {
  const validated = sellerInvoiceSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  let id: string
  try {
    await requireModulePermission(supabase, "finance", "create")
    id = await createSellerInvoiceQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save invoice." }
  }

  revalidatePath(`/finance/sellers/${input.sellerId}`)
  // Executive Dashboard ("/") and Reports both derive Revenue/COGS/Gross
  // Profit from this same table (see reports.ts's getDashboardStats() ->
  // finance-sellers.ts's getSellerRevenueStats()). Next's client Router
  // Cache holds dynamic routes for 30s (next.config.ts), so without this
  // those pages could keep showing stale totals for up to 30s after a
  // seller invoice changes elsewhere - this makes the update immediate.
  revalidatePath("/")
  revalidatePath("/reports")
  return { id }
}

export async function updateSellerInvoice(id: string, input: SellerInvoiceInput): Promise<FinanceActionState> {
  const validated = sellerInvoiceSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "edit")
    await updateSellerInvoiceQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update invoice." }
  }

  revalidatePath(`/finance/sellers/${input.sellerId}`)
  revalidatePath("/")
  revalidatePath("/reports")
  return {}
}

export async function deleteSellerInvoice(id: string, sellerId: string): Promise<FinanceActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "delete")
    await deleteSellerInvoiceQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete invoice." }
  }

  revalidatePath(`/finance/sellers/${sellerId}`)
  revalidatePath("/")
  revalidatePath("/reports")
  return {}
}

export interface LoadMoreSellerInvoicesResult {
  invoices: FinanceSellerInvoiceListItem[]
  hasMore: boolean
}

export async function loadMoreSellerInvoices(sellerId: string, offset: number): Promise<LoadMoreSellerInvoicesResult> {
  const supabase = await createClient()
  return getSellerInvoices(supabase, { sellerId, offset, limit: FINANCE_INVOICES_PAGE_SIZE })
}
