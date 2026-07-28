// Generic over any category's target-field union - each category supplies
// its own field list + alias dictionary (see types/loose-diamond.ts,
// types/jewelry.ts) rather than this module hardcoding one shape.
export type ColumnMapping<TField extends string> = Partial<Record<TField, string>>

function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

// Greedy first-match auto-mapping - a header is claimed by at most one
// target field, in field-list order, so e.g. "Weight" can't also get
// claimed by "Stone Weight" after already matching a plain "weight" field.
export function autoDetectColumnMapping<TField extends string>(
  headers: string[],
  fields: readonly TField[],
  aliases: Record<TField, string[]>
): ColumnMapping<TField> {
  const mapping: ColumnMapping<TField> = {}
  const claimed = new Set<string>()

  for (const field of fields) {
    const fieldAliases = aliases[field]
    const match = headers.find((header) => !claimed.has(header) && fieldAliases.includes(normalizeHeader(header)))
    if (match) {
      mapping[field] = match
      claimed.add(match)
    }
  }

  return mapping
}

export function applyColumnMapping<TField extends string>(
  row: Record<string, string>,
  mapping: ColumnMapping<TField>,
  fields: readonly TField[]
): Partial<Record<TField, string>> {
  const mapped: Partial<Record<TField, string>> = {}

  for (const field of fields) {
    const header = mapping[field]
    if (header && row[header] !== undefined && row[header] !== "") {
      mapped[field] = row[header]
    }
  }

  return mapped
}
