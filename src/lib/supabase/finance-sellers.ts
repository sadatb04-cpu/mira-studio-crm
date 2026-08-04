import type { SupabaseClient } from "@supabase/supabase-js"

import type { FinanceSellerInvoiceListItem, FinanceSellerSummary } from "@/types/finance"
import type { FinanceSellerFormInput, SellerInvoiceInput } from "@/lib/validations/finance"

const BUCKET = "documents"
export const FINANCE_INVOICES_PAGE_SIZE = 20

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_type: "finance_seller" | "finance_seller_invoice"; entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function getSellerDashboardStats(supabase: SupabaseClient): Promise<{ sellerCount: number; totalSellerProfit: number }> {
  const [{ count, error: countError }, { data: invoiceRows, error: invoiceError }] = await Promise.all([
    supabase.from("finance_sellers").select("id", { count: "exact", head: true }),
    supabase.from("finance_seller_invoices").select("profit"),
  ])
  if (countError) throw countError
  if (invoiceError) throw invoiceError

  return {
    sellerCount: count ?? 0,
    totalSellerProfit: (invoiceRows ?? []).reduce((sum, row) => sum + row.profit, 0),
  }
}

export async function getSellerOptions(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("finance_sellers").select("id, name").order("name")
  if (error) throw error
  return data ?? []
}

export async function getSellers(supabase: SupabaseClient, filters: { search?: string } = {}): Promise<FinanceSellerSummary[]> {
  let query = supabase.from("finance_sellers").select("id, name, created_at, updated_at").order("name")
  if (filters.search) query = query.ilike("name", `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error

  const sellers = data ?? []
  if (sellers.length === 0) return []

  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("finance_seller_invoices")
    .select("seller_id, profit")
    .in(
      "seller_id",
      sellers.map((row) => row.id)
    )
  if (invoiceError) throw invoiceError

  const statsBySeller = new Map<string, { count: number; profit: number }>()
  for (const row of invoiceRows ?? []) {
    const existing = statsBySeller.get(row.seller_id) ?? { count: 0, profit: 0 }
    existing.count += 1
    existing.profit += row.profit
    statsBySeller.set(row.seller_id, existing)
  }

  return sellers.map((row) => ({
    ...row,
    invoiceCount: statsBySeller.get(row.id)?.count ?? 0,
    totalProfit: statsBySeller.get(row.id)?.profit ?? 0,
  }))
}

export async function getSeller(supabase: SupabaseClient, id: string): Promise<FinanceSellerSummary | null> {
  const { data, error } = await supabase.from("finance_sellers").select("id, name, created_at, updated_at").eq("id", id).maybeSingle()

  if (error) throw error
  if (!data) return null

  const { data: invoices, error: invoiceError } = await supabase.from("finance_seller_invoices").select("profit").eq("seller_id", id)
  if (invoiceError) throw invoiceError

  const rows = invoices ?? []
  return {
    ...data,
    invoiceCount: rows.length,
    totalProfit: rows.reduce((sum, row) => sum + row.profit, 0),
  }
}

export async function createSeller(supabase: SupabaseClient, input: FinanceSellerFormInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("finance_sellers")
    .insert({ name: input.name, created_by: user?.id ?? null })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("A seller with this name already exists.")
    throw error
  }

  const id = data.id as string
  await logActivity(supabase, { entity_type: "finance_seller", entity_id: id, action: "seller_created", description: `Created seller "${input.name}".` })
  return id
}

export async function updateSeller(supabase: SupabaseClient, id: string, input: FinanceSellerFormInput): Promise<void> {
  const { error } = await supabase.from("finance_sellers").update({ name: input.name }).eq("id", id)

  if (error) {
    if (error.code === "23505") throw new Error("A seller with this name already exists.")
    throw error
  }

  await logActivity(supabase, { entity_type: "finance_seller", entity_id: id, action: "seller_renamed", description: `Renamed seller to "${input.name}".` })
}

export async function deleteSeller(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: seller, error: fetchError } = await supabase.from("finance_sellers").select("name").eq("id", id).maybeSingle()
  if (fetchError) throw fetchError
  if (!seller) return

  const { data: invoiceFiles, error: filesError } = await supabase
    .from("finance_seller_invoices")
    .select("file_url")
    .eq("seller_id", id)
    .not("file_url", "is", null)
  if (filesError) throw filesError

  const { error } = await supabase.from("finance_sellers").delete().eq("id", id)
  if (error) throw error

  const paths = (invoiceFiles ?? []).map((row) => row.file_url as string)
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  await logActivity(supabase, { entity_type: "finance_seller", entity_id: id, action: "seller_deleted", description: `Deleted seller "${seller.name}".` })
}

interface GetSellerInvoicesFilters {
  sellerId: string
  search?: string
  invoiceDateAfter?: string
  offset?: number
  limit?: number
}

export async function getSellerInvoices(
  supabase: SupabaseClient,
  filters: GetSellerInvoicesFilters
): Promise<{ invoices: FinanceSellerInvoiceListItem[]; hasMore: boolean }> {
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? FINANCE_INVOICES_PAGE_SIZE

  let query = supabase
    .from("finance_seller_invoices")
    .select(
      "id, seller_id, product_name, manufacturing_price, selling_price, profit, invoice_date, file_name, file_size, mime_type, file_url, google_sheet_url, created_at"
    )
    .eq("seller_id", filters.sellerId)
    .order("invoice_date", { ascending: false })

  if (filters.search) query = query.ilike("product_name", `%${filters.search}%`)
  if (filters.invoiceDateAfter) query = query.gte("invoice_date", filters.invoiceDateAfter)

  if (!filters.search) {
    query = query.range(offset, offset + limit)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = !filters.search && rows.length > limit
  const page = filters.search ? rows : rows.slice(0, limit)

  return { invoices: page, hasMore }
}

export async function createSellerInvoice(supabase: SupabaseClient, input: SellerInvoiceInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("finance_seller_invoices")
    .insert({
      seller_id: input.sellerId,
      product_name: input.productName,
      manufacturing_price: input.manufacturingPrice,
      selling_price: input.sellingPrice,
      invoice_date: input.invoiceDate,
      file_name: input.fileName || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType || null,
      file_url: input.storagePath || null,
      google_sheet_url: input.googleSheetUrl || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    if (input.storagePath) await supabase.storage.from(BUCKET).remove([input.storagePath])
    throw error
  }

  const id = data.id as string
  await logActivity(supabase, { entity_type: "finance_seller_invoice", entity_id: id, action: "invoice_created", description: `Added a ${input.productName} invoice.` })
  return id
}

export async function updateSellerInvoice(supabase: SupabaseClient, id: string, input: SellerInvoiceInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("finance_seller_invoices")
    .select("file_url")
    .eq("id", id)
    .maybeSingle()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("finance_seller_invoices")
    .update({
      product_name: input.productName,
      manufacturing_price: input.manufacturingPrice,
      selling_price: input.sellingPrice,
      invoice_date: input.invoiceDate,
      file_name: input.fileName || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType || null,
      file_url: input.storagePath || null,
      google_sheet_url: input.googleSheetUrl || null,
    })
    .eq("id", id)

  if (error) throw error

  if (existing?.file_url && input.storagePath && existing.file_url !== input.storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.file_url])
  }

  await logActivity(supabase, { entity_type: "finance_seller_invoice", entity_id: id, action: "invoice_updated", description: `Updated a ${input.productName} invoice.` })
}

export async function deleteSellerInvoice(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: invoice, error: fetchError } = await supabase
    .from("finance_seller_invoices")
    .select("product_name, file_url")
    .eq("id", id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!invoice) return

  const { error } = await supabase.from("finance_seller_invoices").delete().eq("id", id)
  if (error) throw error

  if (invoice.file_url) {
    await supabase.storage.from(BUCKET).remove([invoice.file_url])
  }

  await logActivity(supabase, { entity_type: "finance_seller_invoice", entity_id: id, action: "invoice_deleted", description: `Deleted a ${invoice.product_name} invoice.` })
}
