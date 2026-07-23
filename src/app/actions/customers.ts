"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  createCustomer as createCustomerQuery,
  updateCustomer as updateCustomerQuery,
} from "@/lib/supabase/customers"
import { customerFormSchema } from "@/lib/validations/customer"
import type { CustomerFormInput } from "@/lib/validations/customer"

export interface CustomerActionState {
  error?: string
}

export async function createCustomer(input: CustomerFormInput): Promise<CustomerActionState> {
  const validated = customerFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let customerId: string
  try {
    customerId = await createCustomerQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create customer." }
  }

  redirect(`/customers/${customerId}`)
}

export async function updateCustomer(id: string, input: CustomerFormInput): Promise<CustomerActionState> {
  const validated = customerFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateCustomerQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update customer." }
  }

  redirect(`/customers/${id}`)
}

export interface QuickAddCustomerState {
  error?: string
  customer?: { id: string; full_name: string; company_name: string | null; email: string | null }
}

// Used by the order form's inline "create new customer" quick-add - unlike
// createCustomer() above, this never redirects, so the caller stays on the
// order form with the new customer immediately selected.
export async function quickAddCustomer(input: CustomerFormInput): Promise<QuickAddCustomerState> {
  const validated = customerFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    const customerId = await createCustomerQuery(supabase, validated.data)
    return { customer: { id: customerId, full_name: validated.data.full_name, company_name: null, email: validated.data.email || null } }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create customer." }
  }
}
