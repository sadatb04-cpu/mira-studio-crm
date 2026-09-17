"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  LEADS_PAGE_SIZE,
  createLead as createLeadQuery,
  getLeads,
  updateLeadStatus as updateLeadStatusQuery,
} from "@/lib/supabase/leads"
import { createLeadSchema, updateLeadStatusSchema } from "@/lib/validations/lead"
import type { CreateLeadInput } from "@/lib/validations/lead"
import type { LeadListItem, LeadSource, LeadStatus } from "@/types/lead"

export interface LeadActionState {
  error?: string
}

export async function createLead(input: CreateLeadInput): Promise<LeadActionState & { id?: string; created_at?: string }> {
  const validated = createLeadSchema.safeParse(input)
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "sales", "create")
    const { id, created_at } = await createLeadQuery(supabase, validated.data)

    // Invalidates the cached route for any OTHER navigation to /sales (a
    // new tab, coming back later) - the calling client intentionally does
    // NOT router.refresh() after this, since it already reconciles its own
    // optimistic list state and a full RSC re-fetch on every rapid
    // submission would fight the "instant" requirement for no benefit.
    revalidatePath("/sales")
    return { id, created_at }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save lead." }
  }
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<LeadActionState> {
  const validated = updateLeadStatusSchema.safeParse({ status })
  if (!validated.success) return { error: validated.error.issues.map((issue) => issue.message).join(" ") }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "sales", "edit")
    await updateLeadStatusQuery(supabase, id, validated.data.status)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update status." }
  }

  revalidatePath("/sales")
  return {}
}

export interface LoadMoreLeadsResult {
  leads?: LeadListItem[]
  hasMore?: boolean
  error?: string
}

// Unlike the other actions in this file, this one is called from a "Load
// More" click with no surrounding form/dialog to show an error in - it must
// never let a permission/DB/network failure reject uncaught, or the calling
// client's isLoadingMore state gets stuck true forever with no feedback
// (this was flagged in review and is exactly what this try/catch fixes).
export async function loadMoreLeads(
  filters: { search?: string; status?: LeadStatus; source?: LeadSource },
  createdBefore: string
): Promise<LoadMoreLeadsResult> {
  try {
    const supabase = await createClient()
    await requireModulePermission(supabase, "sales", "view")
    return await getLeads(supabase, { ...filters, createdBefore, limit: LEADS_PAGE_SIZE })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load more leads." }
  }
}
