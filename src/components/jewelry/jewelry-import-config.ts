import { jewelryImportRowSchema } from "@/lib/validations/jewelry"
import { findJewelryImportDuplicates, importJewelryChunk, recordJewelryImportBatchAction } from "@/app/actions/jewelry"
import {
  JEWELRY_IMPORT_FIELD_ALIASES,
  JEWELRY_IMPORT_FIELD_LABELS,
  JEWELRY_IMPORT_REQUIRED_FIELDS,
  JEWELRY_IMPORT_TARGET_FIELDS,
} from "@/types/jewelry"
import type { JewelryCategory, JewelryFormInput, JewelryImportField, JewelryStatus } from "@/types/jewelry"
import type { ImportWizardConfig } from "@/components/inventory-import/import-wizard"

function toFormInput(parsed: ReturnType<typeof jewelryImportRowSchema.parse>): JewelryFormInput {
  return {
    sku: parsed.sku,
    productName: parsed.productName,
    category: parsed.category as JewelryCategory | undefined,
    metal: parsed.metal,
    metalPurity: parsed.metalPurity,
    diamondType: parsed.diamondType,
    diamondWeight: parsed.diamondWeight,
    grossWeight: parsed.grossWeight,
    netWeight: parsed.netWeight,
    cost: parsed.cost ?? 0,
    sellingPrice: parsed.sellingPrice ?? 0,
    currentStock: parsed.currentStock ?? 0,
    reorderLevel: 1,
    status: (parsed.status as JewelryStatus | undefined) ?? "active",
    location: parsed.location,
    notes: parsed.notes,
  }
}

export const JEWELRY_IMPORT_CONFIG: ImportWizardConfig<JewelryImportField, JewelryFormInput> = {
  title: "Import Jewelry",
  entityLabel: "Jewelry",
  targetFields: JEWELRY_IMPORT_TARGET_FIELDS,
  fieldLabels: JEWELRY_IMPORT_FIELD_LABELS,
  fieldAliases: JEWELRY_IMPORT_FIELD_ALIASES,
  requiredFields: JEWELRY_IMPORT_REQUIRED_FIELDS,
  // SKU is an assigned code, not a real-world natural key like a diamond's
  // Report Number - a collision can legitimately mean two different
  // physical pieces, so "create a duplicate anyway" is offered here.
  allowCreateDuplicate: true,
  parseRow: (mapped) => {
    const candidate = {
      sku: mapped.sku ?? "",
      productName: mapped.productName ?? "",
      category: mapped.category,
      metal: mapped.metal,
      metalPurity: mapped.metalPurity,
      diamondType: mapped.diamondType,
      diamondWeight: mapped.diamondWeight,
      grossWeight: mapped.grossWeight,
      netWeight: mapped.netWeight,
      cost: mapped.cost,
      sellingPrice: mapped.sellingPrice,
      currentStock: mapped.currentStock,
      status: mapped.status,
      location: mapped.location,
      notes: mapped.notes,
    }
    const result = jewelryImportRowSchema.safeParse(candidate)
    if (!result.success) {
      return { input: null, errors: result.error.issues.map((issue) => issue.message) }
    }
    return { input: toFormInput(result.data), errors: [] }
  },
  buildCandidateKey: (input) => input.sku,
  previewColumns: [
    { label: "SKU", get: ({ mapped }) => mapped.sku ?? "" },
    { label: "Product Name", get: ({ mapped }) => mapped.productName ?? "" },
    { label: "Category", get: ({ mapped }) => mapped.category ?? "" },
    { label: "Quantity", get: ({ mapped }) => mapped.currentStock ?? "0" },
  ],
  findDuplicatesAction: (candidates) => findJewelryImportDuplicates(candidates.map((c) => ({ rowIndex: c.rowIndex, sku: c.key }))),
  importChunkAction: importJewelryChunk,
  recordBatchAction: recordJewelryImportBatchAction,
}
