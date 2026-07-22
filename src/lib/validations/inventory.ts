import { z } from "zod"

export const consumeInventorySchema = z.object({
  inventory_item_id: z.string().min(1, { error: "Select an inventory item." }),
  quantity: z.coerce.number().positive({ error: "Quantity must be greater than 0." }),
  notes: z.string().trim().optional(),
  production_job_id: z.string().min(1, { error: "Production job is required." }),
})

export const adjustInventorySchema = z.object({
  inventory_item_id: z.string().min(1, { error: "Inventory item is required." }),
  quantity: z.coerce.number().positive({ error: "Quantity must be greater than 0." }),
  direction: z.enum(["increase", "decrease"]),
  notes: z.string().trim().optional(),
})

export type ConsumeInventoryInput = z.infer<typeof consumeInventorySchema>
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>
