import type { SupabaseClient } from "@supabase/supabase-js"

import { getOrderOptions, getProductionJobOptions } from "@/lib/supabase/tasks"
import { getCustomers } from "@/lib/supabase/orders"
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentRelatedRecord,
  DocumentStats,
  DocumentType,
  RelatedRecordOption,
  RelatedRecordType,
} from "@/types/document"
import type { CreateDocumentInput } from "@/lib/validations/document"

const BUCKET = "documents"
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10

const DOCUMENT_COLUMNS =
  "id, file_name, description, document_type, file_size, mime_type, file_url, created_at, updated_at, order_id, customer_id, production_job_id, uploaded_by"

interface RawDocumentRow {
  id: string
  file_name: string
  description: string | null
  document_type: DocumentType
  file_size: number | null
  mime_type: string | null
  file_url: string
  created_at: string
  updated_at: string
  order_id: string | null
  customer_id: string | null
  production_job_id: string | null
  uploaded_by: string | null
  uploader: { full_name: string } | null
}

interface GetDocumentsFilters {
  search?: string
  documentType?: DocumentType
  uploadedBy?: string
  relatedType?: RelatedRecordType
  uploadedAfter?: string
}

async function resolveRelatedRecordMaps(
  supabase: SupabaseClient,
  rows: Pick<RawDocumentRow, "order_id" | "customer_id" | "production_job_id">[]
) {
  const orderIds = [...new Set(rows.filter((row) => row.order_id).map((row) => row.order_id as string))]
  const customerIds = [...new Set(rows.filter((row) => row.customer_id).map((row) => row.customer_id as string))]
  const jobIds = [...new Set(rows.filter((row) => row.production_job_id).map((row) => row.production_job_id as string))]

  const [ordersResult, customersResult, jobsResult] = await Promise.all([
    orderIds.length > 0
      ? supabase.from("orders").select("id, order_number").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: string; order_number: string }[], error: null }),
    customerIds.length > 0
      ? supabase.from("customers").select("id, full_name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[], error: null }),
    jobIds.length > 0
      ? supabase.from("production_jobs").select("id, job_number").in("id", jobIds)
      : Promise.resolve({ data: [] as { id: string; job_number: string }[], error: null }),
  ])

  if (ordersResult.error) throw ordersResult.error
  if (customersResult.error) throw customersResult.error
  if (jobsResult.error) throw jobsResult.error

  return {
    orderMap: new Map((ordersResult.data ?? []).map((row) => [row.id, row.order_number])),
    customerMap: new Map((customersResult.data ?? []).map((row) => [row.id, row.full_name])),
    jobMap: new Map((jobsResult.data ?? []).map((row) => [row.id, row.job_number])),
  }
}

function buildRelatedRecord(
  row: Pick<RawDocumentRow, "order_id" | "customer_id" | "production_job_id">,
  maps: { orderMap: Map<string, string>; customerMap: Map<string, string>; jobMap: Map<string, string> }
): DocumentRelatedRecord | null {
  if (row.order_id) {
    return { type: "order", id: row.order_id, label: maps.orderMap.get(row.order_id) ?? row.order_id }
  }
  if (row.customer_id) {
    return { type: "customer", id: row.customer_id, label: maps.customerMap.get(row.customer_id) ?? row.customer_id }
  }
  if (row.production_job_id) {
    return {
      type: "production_job",
      id: row.production_job_id,
      label: maps.jobMap.get(row.production_job_id) ?? row.production_job_id,
    }
  }
  return null
}

function toListItem(row: RawDocumentRow, maps: Awaited<ReturnType<typeof resolveRelatedRecordMaps>>): DocumentListItem {
  return {
    id: row.id,
    description: row.description,
    file_name: row.file_name,
    document_type: row.document_type,
    file_size: row.file_size,
    mime_type: row.mime_type,
    created_at: row.created_at,
    uploadedByName: row.uploader?.full_name ?? null,
    relatedRecord: buildRelatedRecord(row, maps),
  }
}

export async function getDocuments(
  supabase: SupabaseClient,
  filters: GetDocumentsFilters = {}
): Promise<DocumentListItem[]> {
  let query = supabase
    .from("documents")
    .select(`${DOCUMENT_COLUMNS}, uploader:profiles!documents_uploaded_by_fkey(full_name)`)
    .order("created_at", { ascending: false })

  if (filters.documentType) {
    query = query.eq("document_type", filters.documentType)
  }

  if (filters.uploadedBy) {
    query = query.eq("uploaded_by", filters.uploadedBy)
  }

  if (filters.uploadedAfter) {
    query = query.gte("created_at", filters.uploadedAfter)
  }

  if (filters.relatedType) {
    const column =
      filters.relatedType === "order"
        ? "order_id"
        : filters.relatedType === "customer"
          ? "customer_id"
          : "production_job_id"
    query = query.not(column, "is", null)
  }

  if (filters.search) {
    // Description is listed first since it's the primary, human-recognized
    // identifier - filename is still searched too, just secondary. This is
    // a plain OR match (either field can hit), not a ranked/relevance
    // search - there's no ranking infrastructure in this simple filter to
    // make one field's match outrank the other's in the result order.
    const pattern = `%${filters.search}%`
    query = query.or(`description.ilike.${pattern},file_name.ilike.${pattern}`)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as RawDocumentRow[]
  const maps = await resolveRelatedRecordMaps(supabase, rows)

  return rows.map((row) => toListItem(row, maps))
}

export async function getDocumentStats(supabase: SupabaseClient): Promise<DocumentStats> {
  const { data, error } = await supabase.from("documents").select("file_size, created_at, updated_at")
  if (error) throw error

  const rows = data ?? []
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    totalDocuments: rows.length,
    totalStorageBytes: rows.reduce((sum, row) => sum + (row.file_size ?? 0), 0),
    uploadedThisMonth: rows.filter((row) => new Date(row.created_at) >= startOfMonth).length,
    recentlyModified: rows.filter((row) => new Date(row.updated_at) >= sevenDaysAgo).length,
  }
}

export async function getDocument(supabase: SupabaseClient, id: string): Promise<DocumentDetail | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(`${DOCUMENT_COLUMNS}, uploader:profiles!documents_uploaded_by_fkey(full_name)`)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as RawDocumentRow
  const maps = await resolveRelatedRecordMaps(supabase, [row])

  let signedUrl: string | null = null
  const signedUrlResult = await supabase.storage.from(BUCKET).createSignedUrl(row.file_url, SIGNED_URL_EXPIRY_SECONDS)
  if (!signedUrlResult.error) {
    signedUrl = signedUrlResult.data.signedUrl
  }

  return {
    ...toListItem(row, maps),
    file_url: row.file_url,
    updated_at: row.updated_at,
    signedUrl,
  }
}

export async function getRelatedRecordOptions(
  supabase: SupabaseClient,
  type: RelatedRecordType
): Promise<RelatedRecordOption[]> {
  if (type === "order") {
    const options = await getOrderOptions(supabase)
    return options.map((option) => ({ id: option.id, label: option.order_number }))
  }

  if (type === "production_job") {
    const options = await getProductionJobOptions(supabase)
    return options.map((option) => ({ id: option.id, label: option.job_number }))
  }

  const customers = await getCustomers(supabase)
  return customers.map((customer) => ({ id: customer.id, label: customer.full_name }))
}

async function logActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, per the sprint requirement - never fail the
  // surrounding upload/delete/download operation if logging fails.
  await supabase.from("activity_logs").insert({
    entity_type: "document",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

// The file itself is uploaded directly from the client to Storage before
// this runs (see DocumentUploadDialog) - this only records the metadata
// row, pointing file_url at the storage path that upload produced.
export async function createDocumentRecord(supabase: SupabaseClient, input: CreateDocumentInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("documents")
    .insert({
      file_name: input.fileName,
      description: input.description,
      document_type: input.documentType,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      file_url: input.storagePath,
      order_id: input.relatedRecordType === "order" ? input.relatedRecordId : null,
      customer_id: input.relatedRecordType === "customer" ? input.relatedRecordId : null,
      production_job_id: input.relatedRecordType === "production_job" ? input.relatedRecordId : null,
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    // Roll back the already-uploaded object so it doesn't become orphaned.
    await supabase.storage.from(BUCKET).remove([input.storagePath])
    throw error
  }

  const documentId = data.id as string
  await logActivity(supabase, { entity_id: documentId, action: "uploaded", description: `Uploaded ${input.fileName}.` })

  return documentId
}

export async function deleteDocument(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("file_url, file_name")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!document) return

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", id)
  if (deleteError) throw deleteError

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([document.file_url])
  if (storageError) {
    // The DB row is already gone; a lingering Storage object is a cleanup
    // concern, not a reason to fail a delete the user already confirmed.
    // (error intentionally not thrown - see comment above)
  }

  await logActivity(supabase, { entity_id: id, action: "deleted", description: `Deleted ${document.file_name}.` })
}

export async function getDownloadUrl(
  supabase: SupabaseClient,
  id: string
): Promise<{ signedUrl: string; fileName: string }> {
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("file_url, file_name")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.file_url, SIGNED_URL_EXPIRY_SECONDS)
  if (error) throw error

  await logActivity(supabase, { entity_id: id, action: "downloaded", description: `Downloaded ${document.file_name}.` })

  return { signedUrl: data.signedUrl, fileName: document.file_name }
}
