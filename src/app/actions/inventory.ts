"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  adjustInventory as adjustInventoryQuery,
  bulkImportInventoryRows,
  consumeInventory as consumeInventoryQuery,
  createInventoryItem as createInventoryItemQuery,
  findDuplicateInventoryItems,
  generateSku,
  recordImportBatch,
} from "@/lib/supabase/inventory"
import type { ResolvedImportRow } from "@/lib/supabase/inventory"
import { adjustInventorySchema, consumeInventorySchema, inventoryItemFormSchema } from "@/lib/validations/inventory"
import type { AdjustInventoryInput, ConsumeInventoryInput } from "@/lib/validations/inventory"
import type {
  ImportSourceType,
  InventoryCategory,
  InventoryImportDuplicateMatch,
  InventoryImportRowResult,
  InventoryImportSummary,
  InventoryItemFormInput,
} from "@/types/inventory"

export interface InventoryActionState {
  error?: string
}

export async function consumeInventory(input: ConsumeInventoryInput): Promise<InventoryActionState> {
  const validated = consumeInventorySchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await consumeInventoryQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record inventory consumption." }
  }

  return {}
}

export async function adjustInventory(input: AdjustInventoryInput): Promise<InventoryActionState> {
  const validated = adjustInventorySchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "edit")
    await adjustInventoryQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to adjust inventory." }
  }

  return {}
}

export async function createInventoryItem(
  input: InventoryItemFormInput
): Promise<InventoryActionState & { id?: string }> {
  const validated = inventoryItemFormSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const result = await createInventoryItemQuery(supabase, validated.data)
    revalidatePath("/inventory")
    return { id: result.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create inventory item." }
  }
}

export async function generateSkuAction(category: InventoryCategory): Promise<{ sku?: string; error?: string }> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const sku = await generateSku(supabase, category)
    return { sku }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate a SKU." }
  }
}

export interface FindImportDuplicatesResult {
  matches?: Record<number, InventoryImportDuplicateMatch>
  error?: string
}

export async function findImportDuplicates(
  candidates: { rowIndex: number; sku?: string; name: string; weight?: number }[]
): Promise<FindImportDuplicatesResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    const matchMap = await findDuplicateInventoryItems(supabase, candidates)
    const matches: Record<number, InventoryImportDuplicateMatch> = {}
    candidates.forEach((candidate) => {
      const match = matchMap.get(candidate.rowIndex)
      if (match) matches[candidate.rowIndex] = match
    })
    return { matches }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to check for duplicates." }
  }
}

export interface ImportInventoryChunkResult {
  results?: InventoryImportRowResult[]
  error?: string
}

// Processes one chunk at a time (the client chunks the full parsed
// dataset and calls this repeatedly) so the wizard's progress bar reflects
// real work completed rather than a single opaque promise.
export async function importInventoryChunk(rows: ResolvedImportRow[]): Promise<ImportInventoryChunkResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    if (rows.some((row) => row.resolution === "update")) {
      await requireModulePermission(supabase, "inventory", "edit")
    }

    for (const row of rows) {
      const validated = inventoryItemFormSchema.safeParse(row.input)
      if (!validated.success) {
        return { error: "One or more rows failed validation unexpectedly. Please re-check the preview." }
      }
    }

    const results = await bulkImportInventoryRows(supabase, rows)
    return { results }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to import this batch." }
  }
}

export async function recordImportBatchAction(input: {
  sourceType: ImportSourceType
  sourceName: string
  googleSheetUrl?: string
  summary: InventoryImportSummary
}): Promise<InventoryActionState> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
    await recordImportBatch(supabase, input)
    revalidatePath("/inventory")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to record the import summary." }
  }
}

const GOOGLE_SHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
const GOOGLE_SHEET_GID_PATTERN = /[?&#]gid=(\d+)/

export interface FetchGoogleSheetResult {
  csv?: string
  error?: string
}

// Only works for sheets shared as "Anyone with the link can view" - there
// is no OAuth/service-account flow here, matching the brief's "shared
// Google Sheets link" scope. Fetched server-side to avoid a browser CORS
// failure against docs.google.com.
export async function fetchGoogleSheetCsv(url: string): Promise<FetchGoogleSheetResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "inventory", "create")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  const idMatch = GOOGLE_SHEET_ID_PATTERN.exec(url)
  if (!idMatch) {
    return { error: "That doesn't look like a Google Sheets link." }
  }

  const gidMatch = GOOGLE_SHEET_GID_PATTERN.exec(url)
  const exportUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${
    gidMatch ? `&gid=${gidMatch[1]}` : ""
  }`

  try {
    const response = await fetch(exportUrl)
    if (!response.ok) {
      return {
        error:
          response.status === 401 || response.status === 403
            ? "This sheet isn't shared publicly. Set sharing to \"Anyone with the link can view\" and try again."
            : "Unable to fetch this Google Sheet.",
      }
    }
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("text/html")) {
      return { error: "This sheet isn't shared publicly. Set sharing to \"Anyone with the link can view\" and try again." }
    }
    return { csv: await response.text() }
  } catch {
    return { error: "Unable to reach Google Sheets. Check the link and try again." }
  }
}
