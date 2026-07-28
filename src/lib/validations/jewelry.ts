import { z } from "zod"

import { JEWELRY_CATEGORIES, JEWELRY_STATUSES } from "@/types/jewelry"

export const jewelryFormSchema = z.object({
  sku: z.string().trim().min(1, { error: "SKU is required." }).max(50),
  productName: z.string().trim().min(1, { error: "Product name is required." }).max(200),
  category: z.enum(JEWELRY_CATEGORIES, { error: "Select a category." }).optional(),
  metal: z.string().trim().max(50).optional(),
  metalPurity: z.string().trim().max(30).optional(),
  diamondType: z.string().trim().max(50).optional(),
  diamondWeight: z.coerce.number().min(0).optional(),
  grossWeight: z.coerce.number().min(0).optional(),
  netWeight: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0, { error: "Cost cannot be negative." }),
  sellingPrice: z.coerce.number().min(0, { error: "Selling price cannot be negative." }),
  currentStock: z.coerce.number().min(0, { error: "Quantity cannot be negative." }),
  reorderLevel: z.coerce.number().min(0, { error: "Reorder level cannot be negative." }),
  status: z.enum(JEWELRY_STATUSES, { error: "Select a status." }),
  location: z.string().trim().max(100).optional(),
  supplierId: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type JewelryFormInput = z.infer<typeof jewelryFormSchema>

// Applied per-row during bulk import, after column mapping.
export const jewelryImportRowSchema = z.object({
  sku: z.string().trim().min(1, { error: "SKU is required." }),
  productName: z.string().trim().min(1, { error: "Product Name is required." }),
  category: z.string().trim().optional(),
  metal: z.string().trim().optional(),
  metalPurity: z.string().trim().optional(),
  diamondType: z.string().trim().optional(),
  diamondWeight: z.coerce.number({ error: "Diamond Weight must be a number." }).min(0).optional(),
  grossWeight: z.coerce.number({ error: "Gross Weight must be a number." }).min(0).optional(),
  netWeight: z.coerce.number({ error: "Net Weight must be a number." }).min(0).optional(),
  cost: z.coerce.number({ error: "Cost must be a number." }).min(0).optional(),
  sellingPrice: z.coerce.number({ error: "Selling Price must be a number." }).min(0).optional(),
  currentStock: z.coerce.number({ error: "Quantity must be a number." }).min(0).optional(),
  status: z.string().trim().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type JewelryImportRowInput = z.infer<typeof jewelryImportRowSchema>

export const adjustJewelryStockSchema = z.object({
  jewelryItemId: z.string().min(1, { error: "Item is required." }),
  quantity: z.coerce.number().positive({ error: "Quantity must be greater than 0." }),
  direction: z.enum(["increase", "decrease"]),
  notes: z.string().trim().optional(),
})

export type AdjustJewelryStockInput = z.infer<typeof adjustJewelryStockSchema>
