import { z } from "zod"

import {
  ALLOWED_ORDER_FILE_MIME_TYPES,
  MAX_ORDER_FILE_SIZE_BYTES,
  ORDER_IMPORT_ALLOWED_CURRENCIES,
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  STONE_SHAPES,
  STONE_TYPES,
} from "@/types/order"

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

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.email().safeParse(value).success, { error: "Enter a valid email address." })

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), { error: "Enter a valid date." })

const optionalImportCurrency = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      !value || (ORDER_IMPORT_ALLOWED_CURRENCIES as readonly string[]).includes(value.toUpperCase()),
    { error: `Currency must be one of: ${ORDER_IMPORT_ALLOWED_CURRENCIES.join(", ")}` }
  )

// Applied per-row during bulk import, straight after column mapping - every
// value arrives as a raw string from the parsed file, so a missing/malformed
// value must produce a readable error rather than a thrown exception. Only
// orderNumber/customerName are actually required (see
// ORDER_IMPORT_REQUIRED_FIELDS) - everything else is optional here and
// normalized/defaulted by order-import-config.ts's parseRow.
export const orderImportRowSchema = z.object({
  orderNumber: z.string().trim().min(1, { error: "Order Number is required." }),
  customerName: z.string().trim().min(1, { error: "Customer Name is required." }),
  customerEmail: optionalEmail,
  customerPhone: z.string().trim().optional(),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  orderDate: optionalDateString,
  dueDate: optionalDateString,
  deliveryDate: optionalDateString,
  salesPerson: z.string().trim().optional(),
  metal: z.string().trim().optional(),
  metalPurity: z.string().trim().optional(),
  diamondType: z.string().trim().optional(),
  diamondShape: z.string().trim().optional(),
  diamondCarat: z.coerce.number({ error: "Diamond Carat must be a number." }).min(0).optional(),
  ringSize: z.string().trim().optional(),
  totalAmount: z.coerce.number({ error: "Total Amount must be a number." }).min(0).optional(),
  advancePaid: z.coerce.number({ error: "Advance Paid must be a number." }).min(0).optional(),
  currency: optionalImportCurrency,
  notes: z.string().trim().optional(),
})

export type OrderImportRowSchemaInput = z.infer<typeof orderImportRowSchema>

// Server-side safety net re-validation of the already-normalized
// OrderImportInput the wizard sends to importOrdersChunk - same role as
// looseDiamondFormSchema.safeParse(row.input) in importLooseDiamondsChunk.
export const orderImportInputSchema = z.object({
  orderNumber: z.string().trim().min(1),
  customerName: z.string().trim().min(1),
  customerEmail: optionalEmail,
  customerPhone: z.string().trim().optional(),
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  priority: z.enum(ORDER_PRIORITIES),
  orderDate: optionalDateString,
  dueDate: optionalDateString,
  deliveryDate: optionalDateString,
  salesPerson: z.string().trim().optional(),
  metal: z.string().trim().optional(),
  metalPurity: z.string().trim().optional(),
  diamondType: z.enum(STONE_TYPES).optional(),
  diamondShape: z.enum(STONE_SHAPES).optional(),
  diamondCarat: z.coerce.number().min(0).optional(),
  ringSize: z.string().trim().optional(),
  totalAmount: z.coerce.number().min(0),
  advancePaid: z.coerce.number().min(0),
  currency: z.string().trim().min(1),
  notes: z.string().trim().optional(),
})
