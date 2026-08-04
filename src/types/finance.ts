// Extends the Documents module's allowed file types (see document.ts) with
// CSV, which the Finance spec explicitly calls out but Documents does not
// support. Kept as its own constant rather than widening
// ALLOWED_DOCUMENT_MIME_TYPES, since that list is shared by an unrelated
// module with its own (narrower) requirements.
export const ALLOWED_FINANCE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const
export type AllowedFinanceMimeType = (typeof ALLOWED_FINANCE_MIME_TYPES)[number]

export const MAX_FINANCE_FILE_SIZE_BYTES = 25 * 1024 * 1024

export const FINANCE_EXPENSE_CATEGORIES = [
  "salaries",
  "office_rent",
  "internet",
  "electricity",
  "marketing",
  "software",
  "shipping",
  "miscellaneous",
] as const
export type FinanceExpenseCategory = (typeof FINANCE_EXPENSE_CATEGORIES)[number]

export const FINANCE_EXPENSE_CATEGORY_LABELS: Record<FinanceExpenseCategory, string> = {
  salaries: "Salaries",
  office_rent: "Office Rent",
  internet: "Internet",
  electricity: "Electricity",
  marketing: "Marketing",
  software: "Software",
  shipping: "Shipping",
  miscellaneous: "Miscellaneous",
}

// Every invoice/expense row shares this attachment shape - a file uploaded
// to the shared "documents" Storage bucket (file_url is a Storage *path*,
// matching documents.ts's identical, slightly-misleading-but-consistent
// naming) OR a Google Sheets link. At least one is always present -
// enforced by a DB check constraint (see migration 0024).
export interface FinanceAttachment {
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  file_url: string | null
  google_sheet_url: string | null
}

export interface FinanceManufacturerSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
  invoiceCount: number
  totalManufacturingSpend: number
}

export interface FinanceManufacturerInvoiceListItem extends FinanceAttachment {
  id: string
  manufacturer_id: string
  product_type: string
  manufacturing_price: number
  invoice_date: string
  notes: string | null
  created_at: string
}

export interface FinanceSellerSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
  invoiceCount: number
  totalProfit: number
}

export interface FinanceSellerInvoiceListItem extends FinanceAttachment {
  id: string
  seller_id: string
  product_name: string
  manufacturing_price: number
  selling_price: number
  profit: number
  invoice_date: string
  created_at: string
}

export interface FinanceExpenseListItem extends FinanceAttachment {
  id: string
  category: FinanceExpenseCategory
  amount: number
  expense_date: string
  notes: string | null
  created_at: string
}

export interface FinanceDashboardStats {
  manufacturerCount: number
  sellerCount: number
  totalManufacturingSpend: number
  totalSellerProfit: number
  totalCompanyExpensesThisMonth: number
}
