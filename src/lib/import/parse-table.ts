import Papa from "papaparse"
import { readSheet } from "read-excel-file/browser"
import type { Row } from "read-excel-file/browser"

export interface ParsedTable {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsvText(text: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  return { headers: result.meta.fields ?? [], rows: result.data }
}

export function parseCsvFile(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve({ headers: result.meta.fields ?? [], rows: result.data }),
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

  return { headers, rows: dataRows }
}
