"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  createOrder as createOrderQuery,
  markOrderDelivered as markOrderDeliveredQuery,
  updateOrder as updateOrderQuery,
} from "@/lib/supabase/orders"
import { orderFormSchema } from "@/lib/validations/order"
import type { OrderFormInput } from "@/lib/validations/order"

export interface OrderActionState {
  error?: string
}

function toWriteInput(validated: OrderFormInput) {
  return {
    customer_id: validated.customer_id,
    due_date: validated.due_date || null,
    notes: validated.notes || null,
    product_name: validated.product_name,
    files: validated.files.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_url: file.file_url ?? "",
      file_type: file.file_type,
      file_size: file.file_size,
    })),
  }
}

export async function createOrder(input: OrderFormInput): Promise<OrderActionState> {
  const validated = orderFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let orderId: string
  try {
    orderId = await createOrderQuery(supabase, toWriteInput(validated.data))
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create order." }
  }

  redirect(`/orders/${orderId}`)
}

export async function updateOrder(orderId: string, input: OrderFormInput): Promise<OrderActionState> {
  const validated = orderFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateOrderQuery(supabase, orderId, toWriteInput(validated.data))
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update order." }
  }

  redirect(`/orders/${orderId}`)
}

export async function markOrderDelivered(orderId: string): Promise<OrderActionState> {
  const supabase = await createClient()

  try {
    await markOrderDeliveredQuery(supabase, orderId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to mark this order as delivered." }
  }

  revalidatePath(`/orders/${orderId}`)
  return {}
}
