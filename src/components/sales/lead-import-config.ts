import { leadImportRowSchema } from "@/lib/validations/lead"
import { findLeadImportDuplicates, importLeadsChunk, recordLeadImportBatchAction } from "@/app/actions/leads"
import {
  LEAD_IMPORT_FIELD_ALIASES,
  LEAD_IMPORT_FIELD_LABELS,
  LEAD_IMPORT_REQUIRED_FIELDS,
  LEAD_IMPORT_TARGET_FIELDS,
  LEAD_SOURCE_LABELS,
} from "@/types/lead"
import type { LeadImportField, LeadImportInput } from "@/types/lead"
import type { ImportWizardConfig } from "@/components/inventory-import/import-wizard"

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

// Matches free text against either a Source enum's key (e.g. "cold_outreach")
// or its display label (e.g. "Cold Outreach") - a spreadsheet is equally
// likely to contain either form. Mirrors order-import-config.ts's identical
// helper.
function matchByLabel<T extends string>(value: string | undefined, labels: Record<T, string>): T | undefined {
  if (!value) return undefined
  const target = normalize(value)
  return (Object.keys(labels) as T[]).find((key) => normalize(key) === target || normalize(labels[key]) === target)
}

// Source is never a reject reason (same "Status/Priority never reject a
// row" rule Orders follows) - an unrecognized value is left unset rather
// than guessed at or defaulted to something that might be factually wrong.
function toLeadImportInput(parsed: ReturnType<typeof leadImportRowSchema.parse>): LeadImportInput {
  return {
    fullName: parsed.fullName,
    phone: parsed.phone,
    email: parsed.email,
    source: matchByLabel(parsed.source, LEAD_SOURCE_LABELS),
    notes: parsed.notes,
  }
}

export const LEAD_IMPORT_CONFIG: ImportWizardConfig<LeadImportField, LeadImportInput> = {
  title: "Import Leads",
  entityLabel: "Leads",
  targetFields: LEAD_IMPORT_TARGET_FIELDS,
  fieldLabels: LEAD_IMPORT_FIELD_LABELS,
  fieldAliases: LEAD_IMPORT_FIELD_ALIASES,
  requiredFields: LEAD_IMPORT_REQUIRED_FIELDS,
  // Leads have no immutable natural business key (unlike an Order Number) -
  // a matched phone/email is a soft, reviewable signal, not a record that
  // must never be touched. Update is offered (e.g. re-importing a
  // corrected spreadsheet with a fixed phone number); creating a second
  // lead for an already-matched phone/email is never offered, since
  // avoiding exactly that duplication is the whole point of this check.
  allowCreateDuplicate: false,
  allowUpdateDuplicate: true,
  // Extends the generalized wizard's Google Sheets fetch (see
  // fetchGoogleSheetCsv in actions/inventory.ts) to check "sales" access
  // instead of its "inventory" default - without this, a Sales-only user
  // (no inventory:create) would be incorrectly blocked from importing leads
  // from a Google Sheet, even though the button itself is already
  // permission-gated on "sales".
  permissionModule: "sales",
  parseRow: (mapped) => {
    const candidate = {
      fullName: mapped.fullName ?? "",
      phone: mapped.phone ?? "",
      email: mapped.email,
      source: mapped.source,
      notes: mapped.notes,
    }
    const result = leadImportRowSchema.safeParse(candidate)
    if (!result.success) {
      return { input: null, errors: result.error.issues.map((issue) => issue.message) }
    }
    return { input: toLeadImportInput(result.data), errors: [] }
  },
  // Encodes both duplicate-check fields into one opaque string, since the
  // wizard's generic contract is one key per row - findLeadImportDuplicates
  // (actions/leads.ts) splits it back into phone/email server-side.
  buildCandidateKey: (input) => `${input.phone}::${input.email ?? ""}`,
  previewColumns: [
    { label: "Name", get: ({ mapped }) => mapped.fullName ?? "" },
    { label: "Phone", get: ({ mapped }) => mapped.phone ?? "" },
    { label: "Email", get: ({ mapped }) => mapped.email ?? "" },
    { label: "Source", get: ({ input }) => (input?.source ? LEAD_SOURCE_LABELS[input.source] : "") },
  ],
  findDuplicatesAction: (candidates) =>
    findLeadImportDuplicates(
      candidates.map((c) => {
        const [phone, email] = c.key.split("::")
        return { rowIndex: c.rowIndex, phone, email: email || undefined }
      })
    ),
  importChunkAction: importLeadsChunk,
  recordBatchAction: recordLeadImportBatchAction,
}
