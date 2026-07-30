import { orderImportRowSchema } from "@/lib/validations/order"
import { findOrderImportDuplicates, importOrdersChunk, recordOrderImportBatchAction } from "@/app/actions/orders"
import {
  ORDER_IMPORT_FIELD_ALIASES,
  ORDER_IMPORT_FIELD_LABELS,
  ORDER_IMPORT_REQUIRED_FIELDS,
  ORDER_IMPORT_TARGET_FIELDS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_LABELS,
  STONE_SHAPE_LABELS,
  STONE_TYPE_LABELS,
} from "@/types/order"
import type { OrderImportField, OrderImportInput } from "@/types/order"
import type { ImportWizardConfig } from "@/components/inventory-import/import-wizard"

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

// Matches free text against either an enum's key (e.g. "lab_diamond") or its
// display label (e.g. "Lab Diamond") - a spreadsheet is equally likely to
// contain either form.
function matchByLabel<T extends string>(value: string | undefined, labels: Record<T, string>): T | undefined {
  if (!value) return undefined
  const target = normalize(value)
  return (Object.keys(labels) as T[]).find((key) => normalize(key) === target || normalize(labels[key]) === target)
}

// Status/Priority/Diamond Type/Diamond Shape are never reject reasons (see
// STEP 5 of the brief - only missing customer name/order number, invalid
// dates, invalid email, invalid currency reject a row) - an unrecognized
// value here falls back to a sensible default instead of failing the row.
function toOrderImportInput(parsed: ReturnType<typeof orderImportRowSchema.parse>): OrderImportInput {
  const hasStoneInfo = Boolean(parsed.diamondType || parsed.diamondShape || parsed.diamondCarat)

  return {
    orderNumber: parsed.orderNumber,
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail,
    customerPhone: parsed.customerPhone,
    status: matchByLabel(parsed.status, ORDER_STATUS_LABELS) ?? "draft",
    priority: matchByLabel(parsed.priority, ORDER_PRIORITY_LABELS) ?? "normal",
    orderDate: parsed.orderDate,
    dueDate: parsed.dueDate,
    deliveryDate: parsed.deliveryDate,
    salesPerson: parsed.salesPerson,
    metal: parsed.metal,
    metalPurity: parsed.metalPurity,
    diamondType: hasStoneInfo ? matchByLabel(parsed.diamondType, STONE_TYPE_LABELS) ?? "other" : undefined,
    diamondShape: hasStoneInfo ? matchByLabel(parsed.diamondShape, STONE_SHAPE_LABELS) ?? "other" : undefined,
    diamondCarat: parsed.diamondCarat,
    ringSize: parsed.ringSize,
    totalAmount: parsed.totalAmount ?? 0,
    advancePaid: parsed.advancePaid ?? 0,
    currency: parsed.currency ? parsed.currency.toUpperCase() : "USD",
    notes: parsed.notes,
  }
}

export const ORDER_IMPORT_CONFIG: ImportWizardConfig<OrderImportField, OrderImportInput> = {
  title: "Import Orders",
  entityLabel: "Orders",
  targetFields: ORDER_IMPORT_TARGET_FIELDS,
  fieldLabels: ORDER_IMPORT_FIELD_LABELS,
  fieldAliases: ORDER_IMPORT_FIELD_ALIASES,
  requiredFields: ORDER_IMPORT_REQUIRED_FIELDS,
  // Order Number is a real business document number - an existing order is
  // never overwritten or duplicated by an import, only skipped.
  allowCreateDuplicate: false,
  allowUpdateDuplicate: false,
  parseRow: (mapped) => {
    const candidate = {
      orderNumber: mapped.orderNumber ?? "",
      customerName: mapped.customerName ?? "",
      customerEmail: mapped.customerEmail,
      customerPhone: mapped.customerPhone,
      status: mapped.status,
      priority: mapped.priority,
      orderDate: mapped.orderDate,
      dueDate: mapped.dueDate,
      deliveryDate: mapped.deliveryDate,
      salesPerson: mapped.salesPerson,
      metal: mapped.metal,
      metalPurity: mapped.metalPurity,
      diamondType: mapped.diamondType,
      diamondShape: mapped.diamondShape,
      diamondCarat: mapped.diamondCarat,
      ringSize: mapped.ringSize,
      totalAmount: mapped.totalAmount,
      advancePaid: mapped.advancePaid,
      currency: mapped.currency,
      notes: mapped.notes,
    }
    const result = orderImportRowSchema.safeParse(candidate)
    if (!result.success) {
      return { input: null, errors: result.error.issues.map((issue) => issue.message) }
    }
    return { input: toOrderImportInput(result.data), errors: [] }
  },
  buildCandidateKey: (input) => input.orderNumber,
  previewColumns: [
    { label: "Order #", get: ({ mapped }) => mapped.orderNumber ?? "" },
    { label: "Customer", get: ({ mapped }) => mapped.customerName ?? "" },
    { label: "Status", get: ({ input }) => (input ? ORDER_STATUS_LABELS[input.status] : "") },
    { label: "Total", get: ({ input }) => (input ? `${input.currency} ${input.totalAmount.toFixed(2)}` : "") },
  ],
  findDuplicatesAction: (candidates) =>
    findOrderImportDuplicates(candidates.map((c) => ({ rowIndex: c.rowIndex, orderNumber: c.key }))),
  importChunkAction: importOrdersChunk,
  recordBatchAction: recordOrderImportBatchAction,
}
