import { INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/types/inventory"
import type { InventoryCategory } from "@/types/inventory"

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/[\s_-]+/g, "")
}

const LABEL_LOOKUP = new Map<string, InventoryCategory>(
  INVENTORY_CATEGORIES.map((category) => [normalize(INVENTORY_CATEGORY_LABELS[category]), category])
)

// Imported files rarely use the raw enum key ("lab_diamond") - they more
// often have a human label ("Lab Diamonds") or inconsistent casing. Tries
// an exact enum-key match first, then the display label, before giving up.
export function normalizeCategory(value: string): InventoryCategory | undefined {
  const key = normalize(value)
  const directMatch = INVENTORY_CATEGORIES.find((category) => normalize(category) === key)
  if (directMatch) return directMatch
  return LABEL_LOOKUP.get(key)
}
