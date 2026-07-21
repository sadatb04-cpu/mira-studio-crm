"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { createOrder as createOrderQuery } from "@/lib/supabase/orders"
import { createOrderSchema } from "@/lib/validations/order"
import type { CreateOrderInput } from "@/lib/validations/order"

export interface CreateOrderState {
  error?: string
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderState> {
  const validated = createOrderSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let orderId: string
  try {
    orderId = await createOrderQuery(supabase, {
      customer_id: validated.data.customer_id,
      due_date: validated.data.due_date || null,
      notes: validated.data.notes || null,
      items: validated.data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        specifications: {
          jewelry_type: item.jewelry_type || undefined,
          metal: item.metal || undefined,
          metal_purity: item.metal_purity || undefined,
          stone_type: item.stone_type || undefined,
          stone_shape: item.stone_shape || undefined,
          stone_size: item.stone_size || undefined,
          ring_size: item.ring_size || undefined,
          engraving: item.engraving || undefined,
        },
      })),
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create order." }
  }

  redirect(`/orders/${orderId}`)
}
