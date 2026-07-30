"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import { findDuplicatesByKey, recordInventoryImportBatch } from "@/lib/supabase/inventory-shared"
import {
  adjustJewelryStock as adjustJewelryStockQuery,
  bulkImportJewelryItems,
  consumeJewelryStock as consumeJewelryStockQuery,
  createJewelryItem as createJewelryItemQuery,
  updateJewelryItem as updateJewelryItemQuery,
} from "@/lib/supabase/jewelry"
import type { ResolvedJewelryImportRow } from "@/lib/supabase/jewelry"
import { adjustJewelryStockSchema, consumeJewelryStockSchema, jewelryFormSchema } from "@/lib/validations/jewelry"
import type { AdjustJewelryStockInput, ConsumeJewelryStockInput, JewelryFormInput } from "@/lib/validations/jewelry"
import type { ImportDuplicateMatch, ImportRowResult, ImportSourceType, ImportSummary } from "@/types/import"

export interface JewelryActionState {
  error?: string
}

export async function createJewelryItem(input: JewelryFormInput): Promise<JewelryActionState & { id?: string }> {
  const validated = jewelryFormSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const result = await createJewelryItemQuery(supabase, validated.data)
    revalidatePath("/inventory/jewelry")
    revalidatePath("/inventory")
    return { id: result.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to add this item." }
  }
}

export async function updateJewelryItem(id: string, input: JewelryFormInput): Promise<JewelryActionState> {
  const validated = jewelryFormSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await updateJewelryItemQuery(supabase, id, validated.data)
    revalidatePath(`/inventory/jewelry/${id}`)
    revalidatePath("/inventory/jewelry")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update this item." }
  }
}

export async function adjustJewelryStock(input: AdjustJewelryStockInput): Promise<JewelryActionState> {
  const validated = adjustJewelryStockSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await adjustJewelryStockQuery(supabase, validated.data)
    revalidatePath(`/inventory/jewelry/${validated.data.jewelryItemId}`)
    revalidatePath("/inventory/jewelry")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to adjust stock." }
  }
}

export async function consumeJewelryStock(input: ConsumeJewelryStockInput): Promise<JewelryActionState> {
  const validated = consumeJewelryStockSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await consumeJewelryStockQuery(supabase, validated.data)
    revalidatePath(`/inventory/jewelry/${validated.data.jewelryItemId}`)
    revalidatePath("/inventory/jewelry")
    revalidatePath(`/production/${validated.data.productionJobId}`)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record inventory consumption." }
  }
}

export interface FindJewelryDuplicatesResult {
  matches?: Record<number, ImportDuplicateMatch>
  error?: string
}

export async function findJewelryImportDuplicates(candidates: { rowIndex: number; sku: string }[]): Promise<FindJewelryDuplicatesResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const found = await findDuplicatesByKey(
      supabase,
      "jewelry_inventory",
      "sku",
      candidates.map((c) => c.sku)
    )

    const matches: Record<number, ImportDuplicateMatch> = {}
    candidates.forEach((candidate) => {
      const id = found.get(candidate.sku.toLowerCase())
      if (id) matches[candidate.rowIndex] = { id, label: candidate.sku }
    })
    return { matches }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to check for duplicates." }
  }
}

export interface ImportJewelryChunkResult {
  results?: ImportRowResult[]
  error?: string
}

export async function importJewelryChunk(rows: ResolvedJewelryImportRow[]): Promise<ImportJewelryChunkResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    if (rows.some((row) => row.resolution === "update")) {
      await requireModulePermission(supabase, "inventory", "edit")
    }

    for (const row of rows) {
      const validated = jewelryFormSchema.safeParse(row.input)
      if (!validated.success) {
        return { error: "One or more rows failed validation unexpectedly. Please re-check the preview." }
      }
    }

    const results = await bulkImportJewelryItems(supabase, rows)
    return { results }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to import this batch." }
  }
}

export async function recordJewelryImportBatchAction(input: {
  sourceType: ImportSourceType
  sourceName: string
  googleSheetUrl?: string
  summary: ImportSummary
}): Promise<JewelryActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    await recordInventoryImportBatch(supabase, { ...input, category: "jewelry" })
    revalidatePath("/inventory/jewelry")
    revalidatePath("/inventory")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record the import summary." }
  }
}
