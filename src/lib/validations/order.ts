import { z } from "zod"

export const orderItemSchema = z.object({
  description: z.string().trim().min(1, { error: "Product name is required." }),
  jewelry_type: z.string().trim().optional(),
  metal: z.string().trim().optional(),
  metal_purity: z.string().trim().optional(),
  stone_type: z.string().trim().optional(),
  stone_shape: z.string().trim().optional(),
  stone_size: z.string().trim().optional(),
  ring_size: z.string().trim().optional(),
  engraving: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, { error: "Quantity must be greater than 0." }),
  unit_price: z.coerce.number().min(0, { error: "Unit price cannot be negative." }),
})

export const createOrderSchema = z.object({
  customer_id: z.string().min(1, { error: "Select a customer." }),
  due_date: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, { error: "Add at least one order item." }),
})

export type OrderItemInput = z.infer<typeof orderItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
