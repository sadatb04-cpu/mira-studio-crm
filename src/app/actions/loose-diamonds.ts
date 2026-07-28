"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import { findDuplicatesByKey, recordInventoryImportBatch } from "@/lib/supabase/inventory-shared"
import {
  bulkImportLooseDiamonds,
  createLooseDiamond as createLooseDiamondQuery,
  updateLooseDiamond as updateLooseDiamondQuery,
  updateLooseDiamondStatus as updateLooseDiamondStatusQuery,
} from "@/lib/supabase/loose-diamonds"
import type { ResolvedLooseDiamondImportRow } from "@/lib/supabase/loose-diamonds"
import {
  looseDiamondFormSchema,
  updateLooseDiamondStatusSchema,
} from "@/lib/validations/loose-diamonds"
import type { LooseDiamondFormInput } from "@/lib/validations/loose-diamonds"
import type { UpdateLooseDiamondStatusInput } from "@/lib/validations/loose-diamonds"
import type { ImportDuplicateMatch, ImportRowResult, ImportSourceType, ImportSummary } from "@/types/import"

export interface LooseDiamondActionState {
  error?: string
}

export async function createLooseDiamond(
  input: LooseDiamondFormInput
): Promise<LooseDiamondActionState & { id?: string }> {
  const validated = looseDiamondFormSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const result = await createLooseDiamondQuery(supabase, validated.data)
    revalidatePath("/inventory/diamonds")
    revalidatePath("/inventory")
    return { id: result.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to add this diamond." }
  }
}

export async function updateLooseDiamond(id: string, input: LooseDiamondFormInput): Promise<LooseDiamondActionState> {
  const validated = looseDiamondFormSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await updateLooseDiamondQuery(supabase, id, validated.data)
    revalidatePath(`/inventory/diamonds/${id}`)
    revalidatePath("/inventory/diamonds")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update this diamond." }
  }
}

export async function updateLooseDiamondStatusAction(
  input: UpdateLooseDiamondStatusInput
): Promise<LooseDiamondActionState> {
  const validated = updateLooseDiamondStatusSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await updateLooseDiamondStatusQuery(supabase, validated.data)
    revalidatePath(`/inventory/diamonds/${validated.data.looseDiamondId}`)
    revalidatePath("/inventory/diamonds")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update status." }
  }
}

export interface FindLooseDiamondDuplicatesResult {
  matches?: Record<number, ImportDuplicateMatch>
  error?: string
}

export async function findLooseDiamondImportDuplicates(
  candidates: { rowIndex: number; reportNumber: string }[]
): Promise<FindLooseDiamondDuplicatesResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const found = await findDuplicatesByKey(
      supabase,
      "loose_diamonds",
      "report_number",
      candidates.map((c) => c.reportNumber)
    )

    const matches: Record<number, ImportDuplicateMatch> = {}
    candidates.forEach((candidate) => {
      const id = found.get(candidate.reportNumber.toLowerCase())
      if (id) matches[candidate.rowIndex] = { id, label: candidate.reportNumber }
    })
    return { matches }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to check for duplicates." }
  }
}

export interface ImportLooseDiamondsChunkResult {
  results?: ImportRowResult[]
  error?: string
}

// Processes one chunk at a time (the client chunks the full parsed
// dataset and calls this repeatedly) so the wizard's progress bar reflects
// real work completed rather than a single opaque promise.
export async function importLooseDiamondsChunk(
  rows: ResolvedLooseDiamondImportRow[]
): Promise<ImportLooseDiamondsChunkResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    if (rows.some((row) => row.resolution === "update" || row.resolution === "create_duplicate")) {
      await requireModulePermission(supabase, "inventory", "edit")
    }

    for (const row of rows) {
      const validated = looseDiamondFormSchema.safeParse(row.input)
      if (!validated.success) {
        return { error: "One or more rows failed validation unexpectedly. Please re-check the preview." }
      }
    }

    const results = await bulkImportLooseDiamonds(supabase, rows)
    return { results }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to import this batch." }
  }
}

export async function recordLooseDiamondImportBatchAction(input: {
  sourceType: ImportSourceType
  sourceName: string
  googleSheetUrl?: string
  summary: ImportSummary
}): Promise<LooseDiamondActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    await recordInventoryImportBatch(supabase, { ...input, category: "loose_diamonds" })
    revalidatePath("/inventory/diamonds")
    revalidatePath("/inventory")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record the import summary." }
  }
}
