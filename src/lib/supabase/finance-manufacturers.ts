import type { SupabaseClient } from "@supabase/supabase-js"

import type { FinanceManufacturerInvoiceListItem, FinanceManufacturerSummary } from "@/types/finance"
import type { FinanceManufacturerFormInput, ManufacturerInvoiceInput } from "@/lib/validations/finance"

const BUCKET = "documents"
export const FINANCE_INVOICES_PAGE_SIZE = 20

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_type: "finance_manufacturer" | "finance_manufacturer_invoice"; entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, matching every other module's activity logging - never
  // fail the surrounding mutation if this insert fails.
  await supabase.from("activity_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

// Backs the Finance landing page's stat cards - a lightweight count + sum,
// not the full per-manufacturer breakdown getManufacturers() computes.
export async function getManufacturerDashboardStats(
  supabase: SupabaseClient
): Promise<{ manufacturerCount: number; totalManufacturingSpend: number }> {
  const [{ count, error: countError }, { data: invoiceRows, error: invoiceError }] = await Promise.all([
    supabase.from("finance_manufacturers").select("id", { count: "exact", head: true }),
    supabase.from("finance_manufacturer_invoices").select("manufacturing_price"),
  ])
  if (countError) throw countError
  if (invoiceError) throw invoiceError

  return {
    manufacturerCount: count ?? 0,
    totalManufacturingSpend: (invoiceRows ?? []).reduce((sum, row) => sum + row.manufacturing_price, 0),
  }
}

export async function getManufacturerOptions(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("finance_manufacturers").select("id, name").order("name")
  if (error) throw error
  return data ?? []
}

export async function getManufacturers(
  supabase: SupabaseClient,
  filters: { search?: string } = {}
): Promise<FinanceManufacturerSummary[]> {
  let query = supabase.from("finance_manufacturers").select("id, name, created_at, updated_at").order("name")
  if (filters.search) query = query.ilike("name", `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error

  const manufacturers = data ?? []
  if (manufacturers.length === 0) return []

  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("finance_manufacturer_invoices")
    .select("manufacturer_id, manufacturing_price")
    .in(
      "manufacturer_id",
      manufacturers.map((row) => row.id)
    )
  if (invoiceError) throw invoiceError

  const statsByManufacturer = new Map<string, { count: number; total: number }>()
  for (const row of invoiceRows ?? []) {
    const existing = statsByManufacturer.get(row.manufacturer_id) ?? { count: 0, total: 0 }
    existing.count += 1
    existing.total += row.manufacturing_price
    statsByManufacturer.set(row.manufacturer_id, existing)
  }

  return manufacturers.map((row) => ({
    ...row,
    invoiceCount: statsByManufacturer.get(row.id)?.count ?? 0,
    totalManufacturingSpend: statsByManufacturer.get(row.id)?.total ?? 0,
  }))
}

export async function getManufacturer(supabase: SupabaseClient, id: string): Promise<FinanceManufacturerSummary | null> {
  const { data, error } = await supabase
    .from("finance_manufacturers")
    .select("id, name, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { data: invoices, error: invoiceError } = await supabase
    .from("finance_manufacturer_invoices")
    .select("manufacturing_price")
    .eq("manufacturer_id", id)
  if (invoiceError) throw invoiceError

  const rows = invoices ?? []
  return {
    ...data,
    invoiceCount: rows.length,
    totalManufacturingSpend: rows.reduce((sum, row) => sum + row.manufacturing_price, 0),
  }
}

export async function createManufacturer(supabase: SupabaseClient, input: FinanceManufacturerFormInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("finance_manufacturers")
    .insert({ name: input.name, created_by: user?.id ?? null })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("A manufacturer with this name already exists.")
    throw error
  }

  const id = data.id as string
  await logActivity(supabase, { entity_type: "finance_manufacturer", entity_id: id, action: "manufacturer_created", description: `Created manufacturer "${input.name}".` })
  return id
}

export async function updateManufacturer(supabase: SupabaseClient, id: string, input: FinanceManufacturerFormInput): Promise<void> {
  const { error } = await supabase.from("finance_manufacturers").update({ name: input.name }).eq("id", id)

  if (error) {
    if (error.code === "23505") throw new Error("A manufacturer with this name already exists.")
    throw error
  }

  await logActivity(supabase, { entity_type: "finance_manufacturer", entity_id: id, action: "manufacturer_renamed", description: `Renamed manufacturer to "${input.name}".` })
}

export async function deleteManufacturer(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: manufacturer, error: fetchError } = await supabase
    .from("finance_manufacturers")
    .select("name")
    .eq("id", id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!manufacturer) return

  const { data: invoiceFiles, error: filesError } = await supabase
    .from("finance_manufacturer_invoices")
    .select("file_url")
    .eq("manufacturer_id", id)
    .not("file_url", "is", null)
  if (filesError) throw filesError

  // Invoices cascade-delete with the manufacturer at the DB level (see
  // migration 0024); their Storage objects don't, so they're removed
  // explicitly afterward - a lingering object is a cleanup concern, not a
  // reason to fail a delete the user already confirmed, matching
  // deleteDocument()'s identical non-throwing storage cleanup.
  const { error } = await supabase.from("finance_manufacturers").delete().eq("id", id)
  if (error) throw error

  const paths = (invoiceFiles ?? []).map((row) => row.file_url as string)
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  await logActivity(supabase, { entity_type: "finance_manufacturer", entity_id: id, action: "manufacturer_deleted", description: `Deleted manufacturer "${manufacturer.name}".` })
}

interface GetManufacturerInvoicesFilters {
  manufacturerId: string
  search?: string
  invoiceDateAfter?: string
  offset?: number
  limit?: number
}

export async function getManufacturerInvoices(
  supabase: SupabaseClient,
  filters: GetManufacturerInvoicesFilters
): Promise<{ invoices: FinanceManufacturerInvoiceListItem[]; hasMore: boolean }> {
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? FINANCE_INVOICES_PAGE_SIZE

  let query = supabase
    .from("finance_manufacturer_invoices")
    .select(
      "id, manufacturer_id, product_type, manufacturing_price, invoice_date, notes, file_name, file_size, mime_type, file_url, google_sheet_url, created_at"
    )
    .eq("manufacturer_id", filters.manufacturerId)
    .order("invoice_date", { ascending: false })

  if (filters.search) query = query.ilike("product_type", `%${filters.search}%`)
  if (filters.invoiceDateAfter) query = query.gte("invoice_date", filters.invoiceDateAfter)

  // Search results (like Orders') come back in full rather than being
  // range-paginated on top of a filtered query - a manufacturer's invoice
  // list is bounded enough that this tradeoff is fine, and it keeps hasMore
  // meaningful without a second counting query.
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

export async function createManufacturerInvoice(supabase: SupabaseClient, input: ManufacturerInvoiceInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("finance_manufacturer_invoices")
    .insert({
      manufacturer_id: input.manufacturerId,
      product_type: input.productType,
      manufacturing_price: input.manufacturingPrice,
      invoice_date: input.invoiceDate,
      notes: input.notes || null,
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
  await logActivity(supabase, { entity_type: "finance_manufacturer_invoice", entity_id: id, action: "invoice_created", description: `Added a ${input.productType} invoice.` })
  return id
}

export async function updateManufacturerInvoice(supabase: SupabaseClient, id: string, input: ManufacturerInvoiceInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("finance_manufacturer_invoices")
    .select("file_url")
    .eq("id", id)
    .maybeSingle()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("finance_manufacturer_invoices")
    .update({
      product_type: input.productType,
      manufacturing_price: input.manufacturingPrice,
      invoice_date: input.invoiceDate,
      notes: input.notes || null,
      file_name: input.fileName || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType || null,
      file_url: input.storagePath || null,
      google_sheet_url: input.googleSheetUrl || null,
    })
    .eq("id", id)

  if (error) throw error

  // If this update replaced an existing uploaded file with a new one (or a
  // link), the old Storage object is now orphaned - clean it up the same
  // way deleteDocument() does, best-effort.
  if (existing?.file_url && input.storagePath && existing.file_url !== input.storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.file_url])
  }

  await logActivity(supabase, { entity_type: "finance_manufacturer_invoice", entity_id: id, action: "invoice_updated", description: `Updated a ${input.productType} invoice.` })
}

export async function deleteManufacturerInvoice(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: invoice, error: fetchError } = await supabase
    .from("finance_manufacturer_invoices")
    .select("product_type, file_url")
    .eq("id", id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!invoice) return

  const { error } = await supabase.from("finance_manufacturer_invoices").delete().eq("id", id)
  if (error) throw error

  if (invoice.file_url) {
    await supabase.storage.from(BUCKET).remove([invoice.file_url])
  }

  await logActivity(supabase, { entity_type: "finance_manufacturer_invoice", entity_id: id, action: "invoice_deleted", description: `Deleted a ${invoice.product_type} invoice.` })
}
