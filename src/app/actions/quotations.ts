"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission, requireSpecialPermission } from "@/lib/supabase/permissions"
import {
  createQuotation as createQuotationQuery,
  deleteQuotation as deleteQuotationQuery,
  duplicateQuotation as duplicateQuotationQuery,
  updateQuotation as updateQuotationQuery,
  updateQuotationStatus as updateQuotationStatusQuery,
} from "@/lib/supabase/quotations"
import { quotationFormSchema, quotationStatusSchema } from "@/lib/validations/quotation"
import type { QuotationFormInput } from "@/lib/validations/quotation"
import type { QuotationStatus } from "@/types/quotation"

export interface QuotationActionState {
  error?: string
}

export async function createQuotation(orderId: string, input: QuotationFormInput): Promise<QuotationActionState> {
  const validated = quotationFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "quotations", "create")
    await createQuotationQuery(supabase, orderId, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create quotation." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}

export async function updateQuotation(
  orderId: string,
  quotationId: string,
  input: QuotationFormInput
): Promise<QuotationActionState> {
  const validated = quotationFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "quotations", "edit")
    await updateQuotationQuery(supabase, orderId, quotationId, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update quotation." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}

export async function duplicateQuotation(orderId: string, quotationId: string): Promise<QuotationActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "quotations", "create")
    await duplicateQuotationQuery(supabase, orderId, quotationId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to duplicate quotation." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}

export async function deleteQuotation(orderId: string, quotationId: string): Promise<QuotationActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "quotations", "delete")
    await deleteQuotationQuery(supabase, orderId, quotationId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete quotation." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}

export async function updateQuotationStatus(
  orderId: string,
  quotationId: string,
  status: QuotationStatus
): Promise<QuotationActionState> {
  const validated = quotationStatusSchema.safeParse({ status })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    // "Sent" and "Accepted" are gated by their own named special
    // permissions rather than the generic quotations.edit flag - every
    // other transition (Draft/Rejected) only needs edit.
    if (validated.data.status === "sent") {
      await requireSpecialPermission(supabase, "send_quotation")
    } else if (validated.data.status === "accepted") {
      await requireSpecialPermission(supabase, "approve_quotation")
    } else {
      await requireModulePermission(supabase, "quotations", "edit")
    }

    await updateQuotationStatusQuery(supabase, orderId, quotationId, validated.data.status)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update quotation status." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}
