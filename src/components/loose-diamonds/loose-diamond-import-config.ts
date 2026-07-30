import { looseDiamondImportRowSchema } from "@/lib/validations/loose-diamonds"
import {
  findLooseDiamondImportDuplicates,
  importLooseDiamondsChunk,
  recordLooseDiamondImportBatchAction,
} from "@/app/actions/loose-diamonds"
import {
  LOOSE_DIAMOND_IMPORT_FIELD_ALIASES,
  LOOSE_DIAMOND_IMPORT_FIELD_LABELS,
  LOOSE_DIAMOND_IMPORT_REQUIRED_FIELDS,
  LOOSE_DIAMOND_IMPORT_TARGET_FIELDS,
} from "@/types/loose-diamond"
import type { LooseDiamondFormInput, LooseDiamondImportField, LooseDiamondStatus } from "@/types/loose-diamond"
import type { ImportWizardConfig } from "@/components/inventory-import/import-wizard"

function toFormInput(parsed: ReturnType<typeof looseDiamondImportRowSchema.parse>): LooseDiamondFormInput {
  return {
    reportNumber: parsed.reportNumber,
    lab: parsed.lab,
    shape: parsed.shape,
    carat: parsed.carat,
    color: parsed.color,
    clarity: parsed.clarity,
    cut: parsed.cut,
    polish: parsed.polish,
    symmetry: parsed.symmetry,
    fluorescence: parsed.fluorescence,
    growthType: parsed.growthType,
    countryOfOrigin: parsed.countryOfOrigin,
    costUsd: parsed.costUsd ?? 0,
    status: (parsed.status ?? "available") as LooseDiamondStatus,
    notes: parsed.notes,
  }
}

export const LOOSE_DIAMOND_IMPORT_CONFIG: ImportWizardConfig<LooseDiamondImportField, LooseDiamondFormInput> = {
  title: "Import Loose Diamonds",
  entityLabel: "Loose Diamonds",
  targetFields: LOOSE_DIAMOND_IMPORT_TARGET_FIELDS,
  fieldLabels: LOOSE_DIAMOND_IMPORT_FIELD_LABELS,
  fieldAliases: LOOSE_DIAMOND_IMPORT_FIELD_ALIASES,
  requiredFields: LOOSE_DIAMOND_IMPORT_REQUIRED_FIELDS,
  // Report Number is a real-world natural key assigned by the grading lab -
  // "create a duplicate anyway" makes no sense the way a mistyped SKU
  // might for Jewelry, so that resolution option is never offered here.
  allowCreateDuplicate: false,
  parseRow: (mapped) => {
    const candidate = {
      reportNumber: mapped.reportNumber ?? "",
      carat: mapped.carat,
      lab: mapped.lab,
      shape: mapped.shape,
      color: mapped.color,
      clarity: mapped.clarity,
      cut: mapped.cut,
      polish: mapped.polish,
      symmetry: mapped.symmetry,
      fluorescence: mapped.fluorescence,
      growthType: mapped.growthType,
      countryOfOrigin: mapped.countryOfOrigin,
      costUsd: mapped.costUsd,
      status: mapped.status,
      notes: mapped.notes,
    }
    const result = looseDiamondImportRowSchema.safeParse(candidate)
    if (!result.success) {
      return { input: null, errors: result.error.issues.map((issue) => issue.message) }
    }
    return { input: toFormInput(result.data), errors: [] }
  },
  buildCandidateKey: (input) => input.reportNumber,
  previewColumns: [
    { label: "Report #", get: ({ mapped }) => mapped.reportNumber ?? "" },
    { label: "Shape", get: ({ mapped }) => mapped.shape ?? "" },
    { label: "Carat", get: ({ mapped }) => mapped.carat ?? "" },
    { label: "Color", get: ({ mapped }) => mapped.color ?? "" },
    { label: "Clarity", get: ({ mapped }) => mapped.clarity ?? "" },
  ],
  findDuplicatesAction: (candidates) =>
    findLooseDiamondImportDuplicates(candidates.map((c) => ({ rowIndex: c.rowIndex, reportNumber: c.key }))),
  importChunkAction: importLooseDiamondsChunk,
  recordBatchAction: recordLooseDiamondImportBatchAction,
}
