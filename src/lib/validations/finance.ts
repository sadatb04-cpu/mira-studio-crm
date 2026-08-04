import { z } from "zod"

import { ALLOWED_FINANCE_MIME_TYPES, FINANCE_EXPENSE_CATEGORIES, MAX_FINANCE_FILE_SIZE_BYTES } from "@/types/finance"

// Shared by every invoice/expense schema below - the file itself uploads
// directly to Storage from the client before the action runs (same flow as
// documents.ts), so only its resulting metadata/path is validated here.
// googleSheetUrl is the alternative to a file, not a companion to it, so
// both stay optional here and a shared refine (below) enforces that at
// least one is present.
const attachmentShape = {
  fileName: z.string().trim().optional(),
  fileSize: z
    .number()
    .positive()
    .max(MAX_FINANCE_FILE_SIZE_BYTES, { error: "File must be 25 MB or smaller." })
    .optional(),
  mimeType: z.enum(ALLOWED_FINANCE_MIME_TYPES, { error: "Unsupported file type." }).optional(),
  storagePath: z.string().trim().optional(),
  googleSheetUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.url().safeParse(value).success, { error: "Enter a valid URL." }),
}

function hasAttachment(data: { storagePath?: string; googleSheetUrl?: string }) {
  return Boolean(data.storagePath) || Boolean(data.googleSheetUrl)
}

export const financeManufacturerFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Manufacturer name is required." }),
})
export type FinanceManufacturerFormInput = z.infer<typeof financeManufacturerFormSchema>

export const financeSellerFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Seller name is required." }),
})
export type FinanceSellerFormInput = z.infer<typeof financeSellerFormSchema>

export const manufacturerInvoiceSchema = z
  .object({
    manufacturerId: z.string().trim().min(1, { error: "Manufacturer is required." }),
    productType: z.string().trim().min(1, { error: "Product type is required." }),
    manufacturingPrice: z.number().positive({ error: "Manufacturing price must be greater than 0." }),
    invoiceDate: z.string().trim().min(1, { error: "Date is required." }),
    notes: z.string().trim().optional(),
    ...attachmentShape,
  })
  .refine(hasAttachment, { error: "Upload a file or add a Google Sheets link.", path: ["storagePath"] })

export type ManufacturerInvoiceInput = z.infer<typeof manufacturerInvoiceSchema>

export const sellerInvoiceSchema = z
  .object({
    sellerId: z.string().trim().min(1, { error: "Seller is required." }),
    productName: z.string().trim().min(1, { error: "Product name is required." }),
    manufacturingPrice: z.number().positive({ error: "Manufacturing price must be greater than 0." }),
    sellingPrice: z.number().positive({ error: "Selling price must be greater than 0." }),
    invoiceDate: z.string().trim().min(1, { error: "Date is required." }),
    ...attachmentShape,
  })
  .refine(hasAttachment, { error: "Upload a file or add a Google Sheets link.", path: ["storagePath"] })

export type SellerInvoiceInput = z.infer<typeof sellerInvoiceSchema>

export const financeExpenseSchema = z
  .object({
    category: z.enum(FINANCE_EXPENSE_CATEGORIES, { error: "Select a category." }),
    amount: z.number().positive({ error: "Amount must be greater than 0." }),
    expenseDate: z.string().trim().min(1, { error: "Date is required." }),
    notes: z.string().trim().optional(),
    ...attachmentShape,
  })
  .refine(hasAttachment, { error: "Upload a receipt or add a Google Sheets link.", path: ["storagePath"] })

export type FinanceExpenseInput = z.infer<typeof financeExpenseSchema>
