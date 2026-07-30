import Papa from "papaparse"
import { readSheet } from "read-excel-file/browser"
import type { Row } from "read-excel-file/browser"

export interface ParsedTable {
  headers: string[]
  rows: Record<string, string>[]
}

// Both parsers below assume the first row is the header row - true almost
// always, but a blank spacer row or a title/banner row above the real
// headers (both common in real-world spreadsheet templates) makes every
// "header" come back as "". A column with no name can never be mapped to a
// target field anyway, so those are dropped here rather than reaching the
// mapping UI, where they'd render as indistinguishable, same-keyed blank
// options - previously making the dropdown look like it had no headers at
// all instead of surfacing the real problem (wrong header row).
function dropBlankHeaders(headers: string[], rows: Record<string, string>[]): ParsedTable {
  const usableHeaders = headers.filter((header) => header !== "")

  if (usableHeaders.length === 0) {
    throw new Error("Couldn't find any column headers in this file. Make sure the first row contains column names.")
  }

  if (usableHeaders.length === headers.length) {
    return { headers, rows }
  }

  const filteredRows = rows.map((row) => {
    const filtered: Record<string, string> = {}
    for (const header of usableHeaders) filtered[header] = row[header]
    return filtered
  })

  return { headers: usableHeaders, rows: filteredRows }
}

export function parseCsvText(text: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  return dropBlankHeaders(result.meta.fields ?? [], result.data)
}

export function parseCsvFile(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          resolve(dropBlankHeaders(result.meta.fields ?? [], result.data))
        } catch (error) {
          reject(error)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}

export async function parseXlsxFile(file: File): Promise<ParsedTable> {
  const rows = await readSheet(file)
  if (rows.length === 0) {
    throw new Error("This file has no rows.")
  }

  const headers = rows[0].map((cell) => String(cell ?? "").trim())
  const dataRows = rows.slice(1).map((row: Row) => {
    const record: Record<string, string> = {}
    headers.forEach((header: string, index: number) => {
      const cell = row[index]
      record[header] = cell === null || cell === undefined ? "" : String(cell)
    })
    return record
  })

  return dropBlankHeaders(headers, dataRows)
}
