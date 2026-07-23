import { z } from "zod"

import { ALLOWED_ORDER_FILE_MIME_TYPES, MAX_ORDER_FILE_SIZE_BYTES } from "@/types/order"

export const orderFileInputSchema = z
  .object({
    id: z.string().trim().optional(),
    file_name: z.string().trim().min(1, { error: "File is required." }),
    // Only required for a newly-uploaded file (no id yet) - an existing,
    // already-saved file is identified by id alone and isn't re-uploaded.
    file_url: z.string().trim().optional(),
    file_type: z.enum(ALLOWED_ORDER_FILE_MIME_TYPES, { error: "Unsupported file type." }),
    file_size: z
      .number()
      .positive({ error: "File is required." })
      .max(MAX_ORDER_FILE_SIZE_BYTES, { error: "File must be 25 MB or smaller." }),
  })
  .refine((data) => Boolean(data.id) || Boolean(data.file_url), {
    error: "Upload did not complete correctly.",
    path: ["file_url"],
  })

// Simplified order form (Sprint "Simplify Order Creation") - a single
// product name + optional requirements text + optional due date + files.
// Stone/item details are no longer collected here; order_items/order_stones
// stay in the schema for Sales/CAD/Production to populate later.
export const orderFormSchema = z.object({
  customer_id: z.string().min(1, { error: "Select a customer." }),
  product_name: z.string().trim().min(1, { error: "Product name is required." }),
  due_date: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  files: z.array(orderFileInputSchema).default([]),
})

export type OrderFileInput = z.infer<typeof orderFileInputSchema>
export type OrderFormInput = z.infer<typeof orderFormSchema>

// Aliases kept for call-site clarity (create vs. update use the identical shape).
export const createOrderSchema = orderFormSchema
export type CreateOrderInput = OrderFormInput
export const updateOrderSchema = orderFormSchema
export type UpdateOrderInput = OrderFormInput
