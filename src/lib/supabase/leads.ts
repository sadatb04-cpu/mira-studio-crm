import type { SupabaseClient } from "@supabase/supabase-js"

import type { LeadImportInput, LeadListItem, LeadSource, LeadStatus } from "@/types/lead"
import type { CreateLeadInput } from "@/lib/validations/lead"
import type { DuplicateResolution, ImportDuplicateMatch, ImportRowResult } from "@/types/import"

export const LEADS_PAGE_SIZE = 25

const LEAD_LIST_COLUMNS = "id, full_name, phone, email, source, status, created_at"

async function logLeadActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, matching every other module's activity logging -
  // never fails the surrounding create/update.
  await supabase.from("activity_logs").insert({
    entity_type: "lead",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

interface GetLeadsFilters {
  search?: string
  status?: LeadStatus
  source?: LeadSource
  limit?: number
  /**
   * Keyset cursor, not a positional offset: only leads created strictly
   * before this timestamp are returned. Deliberately not offset/range-based
   * - a lead captured via Quick Add is always newer than the entire
   * paginated window, so it would shift every already-fetched row's
   * position by one, silently corrupting a positional offset (this is
   * exactly what caused duplicate rows before this fix). A `created_at`
   * cursor is an absolute value tied to real data, not a position, so
   * inserting new rows above it - from this user's own Quick Add, or from
   * any other concurrent user - can never change what "older than this
   * timestamp" means. See leads-workspace.tsx's oldestCreatedAtRef, which
   * is only ever advanced by a confirmed Load More page, never touched by
   * Quick Add.
   */
  createdBefore?: string
}

// Unlike getOrders()'s search path, this never needs a two-query merge -
// full_name/phone/email all live on this same table (no joined-table search
// target like Orders' customer.full_name), so search and pagination can
// always run in a single query.
export async function getLeads(
  supabase: SupabaseClient,
  filters: GetLeadsFilters = {}
): Promise<{ leads: LeadListItem[]; hasMore: boolean }> {
  const limit = filters.limit ?? LEADS_PAGE_SIZE

  // Fetches limit+1 rows to detect "is there another page?" without a
  // separate count query - same trick getOrders()/getStockMovements() use,
  // just keyset- rather than offset-bounded.
  let query = supabase.from("leads").select(LEAD_LIST_COLUMNS).order("created_at", { ascending: false }).limit(limit + 1)

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.source) {
    query = query.eq("source", filters.source)
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`
    query = query.or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
  }

  if (filters.createdBefore) {
    query = query.lt("created_at", filters.createdBefore)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as LeadListItem[]
  const hasMore = rows.length > limit

  return { leads: rows.slice(0, limit), hasMore }
}

export interface LeadStats {
  totalLeads: number
  newLeads: number
  newThisWeek: number
}

export async function getLeadStats(supabase: SupabaseClient): Promise<LeadStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalResult, newResult, thisWeekResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ])

  if (totalResult.error) throw totalResult.error
  if (newResult.error) throw newResult.error
  if (thisWeekResult.error) throw thisWeekResult.error

  return {
    totalLeads: totalResult.count ?? 0,
    newLeads: newResult.count ?? 0,
    newThisWeek: thisWeekResult.count ?? 0,
  }
}

// Returns id/created_at (not the full row) so the client can patch just
// those two server-assigned fields onto its already-known optimistic row,
// rather than trusting a second round-trip's copy of data it already has.
export async function createLead(supabase: SupabaseClient, input: CreateLeadInput): Promise<{ id: string; created_at: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      notes: input.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id, created_at")
    .single()

  if (error) throw error

  await logLeadActivity(supabase, { entity_id: data.id, action: "created", description: `Captured lead "${input.full_name}".` })

  return data
}

export async function updateLeadStatus(supabase: SupabaseClient, id: string, status: LeadStatus): Promise<void> {
  const { data: existing, error: fetchError } = await supabase.from("leads").select("status").eq("id", id).maybeSingle()
  if (fetchError) throw fetchError
  if (!existing || existing.status === status) return

  const { error } = await supabase.from("leads").update({ status }).eq("id", id)
  if (error) throw error

  await logLeadActivity(supabase, {
    entity_id: id,
    action: "status_changed",
    description: `Status changed from "${existing.status}" to "${status}".`,
  })
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

// Digits only - "555-123-4567", "(555) 123-4567", and "5551234567" must all
// normalize to the same value for duplicate matching, matching Quick Add's
// "don't reject messy real-world numbers with a strict regex" philosophy
// (this just tolerates formatting differences, it doesn't validate shape).
function normalizePhoneForMatch(value: string): string {
  return value.replace(/\D/g, "")
}

export interface LeadDuplicateCandidate {
  rowIndex: number
  phone: string
  email?: string
}

// Leads have no single natural key (unlike Loose Diamonds' report_number or
// Orders' order_number), so this can't reuse inventory-shared.ts's
// single-column findDuplicatesByKey() - "exact phone OR exact email" needs
// an OR across two columns. Fetches id/full_name/phone/email for every lead
// and normalizes both sides in JS (phone digits-only, email trimmed +
// lowercased) - the same "fetch simple, normalize in JS" tradeoff
// findDuplicatesByKey() already accepts for its own exact-match lookups,
// since phone/email aren't stored pre-normalized and PostgREST can't apply
// arbitrary normalization server-side without a generated column this phase
// doesn't add.
export async function findLeadDuplicates(
  supabase: SupabaseClient,
  candidates: LeadDuplicateCandidate[]
): Promise<Map<number, ImportDuplicateMatch>> {
  const { data, error } = await supabase.from("leads").select("id, full_name, phone, email")
  if (error) throw error

  const byPhone = new Map<string, ImportDuplicateMatch>()
  const byEmail = new Map<string, ImportDuplicateMatch>()

  for (const row of data ?? []) {
    const match: ImportDuplicateMatch = { id: row.id, label: row.full_name }
    const normalizedPhone = normalizePhoneForMatch(row.phone)
    if (normalizedPhone) byPhone.set(normalizedPhone, match)
    if (row.email) byEmail.set(row.email.trim().toLowerCase(), match)
  }

  const result = new Map<number, ImportDuplicateMatch>()
  for (const candidate of candidates) {
    const normalizedPhone = normalizePhoneForMatch(candidate.phone)
    const normalizedEmail = candidate.email?.trim().toLowerCase()
    const match = (normalizedPhone && byPhone.get(normalizedPhone)) || (normalizedEmail && byEmail.get(normalizedEmail))
    if (match) result.set(candidate.rowIndex, match)
  }

  return result
}

// Deliberately never sets status/priority/assigned_to - LeadImportInput has
// no such fields, so an imported row always gets the DB's defaults ('new'/
// 'medium'), exactly matching Quick Add and the "raw capture first,
// qualification later" rule.
export async function createLeadFromImportRow(supabase: SupabaseClient, input: LeadImportInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.fullName,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      notes: input.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) throw error

  await logLeadActivity(supabase, { entity_id: data.id, action: "imported", description: `Imported lead "${input.fullName}".` })

  return data.id
}

// Only contact/context fields are touched - status/priority/assigned_to/
// interested_product/requirements_notes are never modified by an import
// update, so a lead already in progress can never be silently reset back to
// square one by re-importing a spreadsheet.
async function updateLeadFromImportRow(supabase: SupabaseClient, id: string, input: LeadImportInput): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      notes: input.notes || null,
    })
    .eq("id", id)

  if (error) throw error

  await logLeadActivity(supabase, {
    entity_id: id,
    action: "updated_via_import",
    description: `Updated from import: "${input.fullName}".`,
  })
}

export interface ResolvedLeadImportRow {
  rowIndex: number
  input: LeadImportInput
  duplicateId: string | null
  resolution: DuplicateResolution
}

// Mirrors bulkImportOrders()'s shape exactly, with one difference: Orders
// unconditionally skips every duplicate (no natural key may ever be
// overwritten by an import), whereas Leads allow "update" - a lead has no
// immutable business document number, so refreshing an existing lead's
// contact details from a corrected spreadsheet is a legitimate, explicit
// (never automatic) choice made in the wizard's preview step.
export async function bulkImportLeads(supabase: SupabaseClient, rows: ResolvedLeadImportRow[]): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = []

  for (const row of rows) {
    if (row.duplicateId) {
      if (row.resolution === "update") {
        try {
          await updateLeadFromImportRow(supabase, row.duplicateId, row.input)
          results.push({ rowIndex: row.rowIndex, status: "updated" })
        } catch (error) {
          results.push({
            rowIndex: row.rowIndex,
            status: "error",
            message: error instanceof Error ? error.message : "Unable to update this lead.",
          })
        }
        continue
      }

      // "skip" is the only other resolution the wizard offers here
      // (allowCreateDuplicate is false, so "create_duplicate" is never
      // sent by the UI) - skip is also the safe fallback for any
      // unrecognized resolution value.
      results.push({ rowIndex: row.rowIndex, status: "skipped", message: "Already exists" })
      continue
    }

    try {
      const id = await createLeadFromImportRow(supabase, row.input)
      results.push({ rowIndex: row.rowIndex, status: "created", message: id })
    } catch (error) {
      results.push({
        rowIndex: row.rowIndex,
        status: "error",
        message: error instanceof Error ? error.message : "Unable to import this row.",
      })
    }
  }

  return results
}
