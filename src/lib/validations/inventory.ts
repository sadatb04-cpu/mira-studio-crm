import { z } from "zod"

import { INVENTORY_CATEGORIES } from "@/types/inventory"

export const inventoryItemFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Item name is required." }).max(200),
  sku: z.string().trim().min(1, { error: "SKU is required." }).max(50),
  category: z.enum(INVENTORY_CATEGORIES, { error: "Select a category." }),
  supplierId: z.string().trim().optional(),
  unit: z.string().trim().min(1, { error: "Unit is required." }).max(30),
  currentStock: z.coerce.number().min(0, { error: "Current stock cannot be negative." }),
  minimumStock: z.coerce.number().min(0, { error: "Minimum stock cannot be negative." }),
  reorderLevel: z.coerce.number().min(0, { error: "Reorder level cannot be negative." }),
  purchasePrice: z.coerce.number().min(0, { error: "Purchase price cannot be negative." }),
  sellingPrice: z.coerce.number().min(0, { error: "Selling price cannot be negative." }),
  metal: z.string().trim().max(50).optional(),
  purity: z.string().trim().max(30).optional(),
  weight: z.coerce.number().min(0).optional(),
  stoneType: z.string().trim().max(50).optional(),
  stoneWeight: z.coerce.number().min(0).optional(),
  certificateNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type InventoryItemFormInput = z.infer<typeof inventoryItemFormSchema>

// Applied per-row during bulk import, after column mapping - deliberately
// looser than the manual-add schema (every field arrives as a string from
// the parsed file and empty/missing values must produce a readable error
// rather than a thrown exception).
export const inventoryImportRowSchema = z.object({
  name: z.string().trim().min(1, { error: "Item Name is required." }),
  category: z.enum(INVENTORY_CATEGORIES, { error: "Category must be one of: " + INVENTORY_CATEGORIES.join(", ") }),
  unit: z.string().trim().min(1, { error: "Unit is required." }),
  sku: z.string().trim().optional(),
  currentStock: z.coerce.number({ error: "Current Stock must be a number." }).min(0).optional(),
  minimumStock: z.coerce.number({ error: "Minimum Stock must be a number." }).min(0).optional(),
  reorderLevel: z.coerce.number({ error: "Reorder Level must be a number." }).min(0).optional(),
  purchasePrice: z.coerce.number({ error: "Purchase Price must be a number." }).min(0).optional(),
  sellingPrice: z.coerce.number({ error: "Selling Price must be a number." }).min(0).optional(),
  metal: z.string().trim().optional(),
  purity: z.string().trim().optional(),
  weight: z.coerce.number({ error: "Weight must be a number." }).min(0).optional(),
  stoneType: z.string().trim().optional(),
  stoneWeight: z.coerce.number({ error: "Stone Weight must be a number." }).min(0).optional(),
  certificateNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type InventoryImportRowInput = z.infer<typeof inventoryImportRowSchema>

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
