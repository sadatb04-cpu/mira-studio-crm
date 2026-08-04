"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  FINANCE_INVOICES_PAGE_SIZE,
  createManufacturer as createManufacturerQuery,
  createManufacturerInvoice as createManufacturerInvoiceQuery,
  deleteManufacturer as deleteManufacturerQuery,
  deleteManufacturerInvoice as deleteManufacturerInvoiceQuery,
  getManufacturerInvoices,
  updateManufacturer as updateManufacturerQuery,
  updateManufacturerInvoice as updateManufacturerInvoiceQuery,
} from "@/lib/supabase/finance-manufacturers"
import { financeManufacturerFormSchema, manufacturerInvoiceSchema } from "@/lib/validations/finance"
import type { FinanceManufacturerFormInput, ManufacturerInvoiceInput } from "@/lib/validations/finance"
import type { FinanceManufacturerInvoiceListItem } from "@/types/finance"

export interface FinanceActionState {
  error?: string
}

export async function createManufacturer(input: FinanceManufacturerFormInput): Promise<FinanceActionState & { id?: string }> {
  const validated = financeManufacturerFormSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  let id: string
  try {
    await requireModulePermission(supabase, "finance", "create")
    id = await createManufacturerQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create manufacturer." }
  }

  revalidatePath("/finance/manufacturing")
  return { id }
}

export async function updateManufacturer(id: string, input: FinanceManufacturerFormInput): Promise<FinanceActionState> {
  const validated = financeManufacturerFormSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "edit")
    await updateManufacturerQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update manufacturer." }
  }

  revalidatePath("/finance/manufacturing")
  revalidatePath(`/finance/manufacturing/${id}`)
  return {}
}

export async function deleteManufacturer(id: string): Promise<FinanceActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "delete")
    await deleteManufacturerQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete manufacturer." }
  }

  revalidatePath("/finance/manufacturing")
  return {}
}

export async function createManufacturerInvoice(input: ManufacturerInvoiceInput): Promise<FinanceActionState & { id?: string }> {
  const validated = manufacturerInvoiceSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  let id: string
  try {
    await requireModulePermission(supabase, "finance", "create")
    id = await createManufacturerInvoiceQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save invoice." }
  }

  revalidatePath(`/finance/manufacturing/${input.manufacturerId}`)
  return { id }
}

export async function updateManufacturerInvoice(id: string, input: ManufacturerInvoiceInput): Promise<FinanceActionState> {
  const validated = manufacturerInvoiceSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "edit")
    await updateManufacturerInvoiceQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update invoice." }
  }

  revalidatePath(`/finance/manufacturing/${input.manufacturerId}`)
  return {}
}

export async function deleteManufacturerInvoice(id: string, manufacturerId: string): Promise<FinanceActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "delete")
    await deleteManufacturerInvoiceQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete invoice." }
  }

  revalidatePath(`/finance/manufacturing/${manufacturerId}`)
  return {}
}

export interface LoadMoreManufacturerInvoicesResult {
  invoices: FinanceManufacturerInvoiceListItem[]
  hasMore: boolean
}

export async function loadMoreManufacturerInvoices(manufacturerId: string, offset: number): Promise<LoadMoreManufacturerInvoicesResult> {
  const supabase = await createClient()
  return getManufacturerInvoices(supabase, { manufacturerId, offset, limit: FINANCE_INVOICES_PAGE_SIZE })
}
