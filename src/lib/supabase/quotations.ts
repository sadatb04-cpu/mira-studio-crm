import type { SupabaseClient } from "@supabase/supabase-js"

import { advanceOrderStatus, logActivity } from "@/lib/supabase/orders"
import type { Quotation, QuotationStatus } from "@/types/quotation"

const QUOTATION_COLUMNS =
  "id, order_id, quote_name, status, metal_cost, stone_cost, labor_cost, cad_cost, setting_cost, certification_cost, hallmark_cost, packaging_cost, shipping_cost, other_charges, discount, grand_total, notes, created_at, updated_at"

export async function getQuotationsForOrder(supabase: SupabaseClient, orderId: string): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from("order_quotations")
    .select(QUOTATION_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as Quotation[]
}

interface QuotationCostInput {
  quote_name: string
  metal_cost?: number
  stone_cost?: number
  labor_cost?: number
  cad_cost?: number
  setting_cost?: number
  certification_cost?: number
  hallmark_cost?: number
  packaging_cost?: number
  shipping_cost?: number
  other_charges?: number
  discount?: number
  notes?: string
}

function toCostRow(input: QuotationCostInput) {
  return {
    quote_name: input.quote_name,
    metal_cost: input.metal_cost ?? 0,
    stone_cost: input.stone_cost ?? 0,
    labor_cost: input.labor_cost ?? 0,
    cad_cost: input.cad_cost ?? 0,
    setting_cost: input.setting_cost ?? 0,
    certification_cost: input.certification_cost ?? 0,
    hallmark_cost: input.hallmark_cost ?? 0,
    packaging_cost: input.packaging_cost ?? 0,
    shipping_cost: input.shipping_cost ?? 0,
    other_charges: input.other_charges ?? 0,
    discount: input.discount ?? 0,
    notes: input.notes || null,
  }
}

// The single source of truth linking quotations to orders.total - keeps
// Reports/Dashboard/Customer-lifetime-value (which all read orders.total)
// correct without touching any of those queries. Resets to 0 when no
// quotation is currently accepted, matching a freshly-created order.
async function syncOrderTotalFromAcceptedQuotation(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data: accepted, error } = await supabase
    .from("order_quotations")
    .select("grand_total")
    .eq("order_id", orderId)
    .eq("status", "accepted")
    .maybeSingle()

  if (error) throw error

  const total = accepted?.grand_total ?? 0
  const { error: updateError } = await supabase.from("orders").update({ subtotal: total, total }).eq("id", orderId)
  if (updateError) throw updateError
}

export async function createQuotation(supabase: SupabaseClient, orderId: string, input: QuotationCostInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("order_quotations")
    .insert({ order_id: orderId, ...toCostRow(input), created_by: user?.id ?? null })
    .select("id")
    .single()

  if (error) throw error

  const quotationId = data.id as string
  await logActivity(supabase, { entity_id: orderId, action: "quotation_created", description: `Created quotation "${input.quote_name}".` })

  // Sprint 4.1.3: the first quotation on a fresh order automatically moves
  // it out of Draft - a no-op (guarded, no log) if the order has already
  // progressed past Draft (e.g. a second/alternative quotation being added later).
  await advanceOrderStatus(supabase, orderId, ["draft"], "pricing_ready", "status_pricing_ready", "Pricing Added.")

  return quotationId
}

export async function updateQuotation(
  supabase: SupabaseClient,
  orderId: string,
  quotationId: string,
  input: QuotationCostInput
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("order_quotations")
    .select("status")
    .eq("id", quotationId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const { error } = await supabase.from("order_quotations").update(toCostRow(input)).eq("id", quotationId)
  if (error) throw error

  // If the accepted quotation's own costs changed, orders.total must follow.
  if (existing?.status === "accepted") {
    await syncOrderTotalFromAcceptedQuotation(supabase, orderId)
  }

  await logActivity(supabase, { entity_id: orderId, action: "quotation_updated", description: `Updated quotation "${input.quote_name}".` })
}

export async function duplicateQuotation(supabase: SupabaseClient, orderId: string, quotationId: string): Promise<string> {
  const { data: original, error: fetchError } = await supabase
    .from("order_quotations")
    .select(QUOTATION_COLUMNS)
    .eq("id", quotationId)
    .single()

  if (fetchError) throw fetchError

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("order_quotations")
    .insert({
      order_id: orderId,
      quote_name: original.quote_name,
      status: "draft",
      metal_cost: original.metal_cost,
      stone_cost: original.stone_cost,
      labor_cost: original.labor_cost,
      cad_cost: original.cad_cost,
      setting_cost: original.setting_cost,
      certification_cost: original.certification_cost,
      hallmark_cost: original.hallmark_cost,
      packaging_cost: original.packaging_cost,
      shipping_cost: original.shipping_cost,
      other_charges: original.other_charges,
      discount: original.discount,
      notes: original.notes,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) throw error

  await logActivity(supabase, {
    entity_id: orderId,
    action: "quotation_duplicated",
    description: `Duplicated quotation "${original.quote_name}".`,
  })

  return data.id as string
}

export async function deleteQuotation(supabase: SupabaseClient, orderId: string, quotationId: string): Promise<void> {
  const { data: quotation, error: fetchError } = await supabase
    .from("order_quotations")
    .select("quote_name, status")
    .eq("id", quotationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!quotation) return

  const { error } = await supabase.from("order_quotations").delete().eq("id", quotationId)
  if (error) throw error

  if (quotation.status === "accepted") {
    await syncOrderTotalFromAcceptedQuotation(supabase, orderId)
  }

  await logActivity(supabase, { entity_id: orderId, action: "quotation_deleted", description: `Deleted quotation "${quotation.quote_name}".` })
}

const STATUS_ACTIONS: Partial<Record<QuotationStatus, string>> = {
  sent: "quotation_sent",
  accepted: "quotation_accepted",
  rejected: "quotation_rejected",
}

export async function updateQuotationStatus(
  supabase: SupabaseClient,
  orderId: string,
  quotationId: string,
  status: QuotationStatus
): Promise<void> {
  if (status === "accepted") {
    // Flip any other currently-accepted quotation to "sent" first - the
    // partial unique index (one accepted row per order) would otherwise
    // reject having two rows accepted at once, even transiently.
    const { data: previouslyAccepted, error: fetchError } = await supabase
      .from("order_quotations")
      .select("id, quote_name")
      .eq("order_id", orderId)
      .eq("status", "accepted")
      .neq("id", quotationId)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (previouslyAccepted) {
      const { error } = await supabase.from("order_quotations").update({ status: "sent" }).eq("id", previouslyAccepted.id)
      if (error) throw error
      await logActivity(supabase, {
        entity_id: orderId,
        action: "quotation_sent",
        description: `"${previouslyAccepted.quote_name}" moved to Sent (another quotation was accepted).`,
      })
    }
  }

  const { data: quotation, error: quotationError } = await supabase
    .from("order_quotations")
    .select("quote_name")
    .eq("id", quotationId)
    .maybeSingle()

  if (quotationError) throw quotationError

  const { error } = await supabase.from("order_quotations").update({ status }).eq("id", quotationId)
  if (error) throw error

  await syncOrderTotalFromAcceptedQuotation(supabase, orderId)

  const action = STATUS_ACTIONS[status]
  if (action && quotation) {
    await logActivity(supabase, {
      entity_id: orderId,
      action,
      description: `"${quotation.quote_name}" marked as ${status}.`,
    })
  }

  // Sprint 4.1.3: this deliberate quotation-status change is exactly the
  // order-level workflow action ("Send Quote" / "Customer Approved" /
  // "Customer Rejected") - each guarded so it's a no-op unless the order is
  // actually in the expected prior stage (e.g. re-sending an already-sent
  // quote, or a quotation status change on an order already in production,
  // does not spuriously move or re-log the order's stage). Deliberately not
  // hooked to the auto-flip-to-"sent" above, which is a side effect of a
  // DIFFERENT quotation being accepted, not this action.
  if (status === "sent") {
    await advanceOrderStatus(supabase, orderId, ["pricing_ready"], "awaiting_approval", "status_awaiting_approval", "Quote Sent.")
  } else if (status === "accepted") {
    await advanceOrderStatus(
      supabase,
      orderId,
      ["pricing_ready", "awaiting_approval"],
      "approved",
      "status_approved",
      "Customer Approved."
    )
  } else if (status === "rejected") {
    await advanceOrderStatus(
      supabase,
      orderId,
      ["pricing_ready", "awaiting_approval", "approved"],
      "pricing_ready",
      "status_rejected",
      "Customer Rejected - returned to Pricing Ready."
    )
  }
}

export async function hasAcceptedQuotation(supabase: SupabaseClient, orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("order_quotations")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "accepted")
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}
