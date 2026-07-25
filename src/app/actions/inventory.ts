"use server"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"
import {
  adjustInventory as adjustInventoryQuery,
  consumeInventory as consumeInventoryQuery,
} from "@/lib/supabase/inventory"
import { adjustInventorySchema, consumeInventorySchema } from "@/lib/validations/inventory"
import type { AdjustInventoryInput, ConsumeInventoryInput } from "@/lib/validations/inventory"

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
