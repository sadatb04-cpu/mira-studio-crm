"use client"

import * as pdfjsLib from "pdfjs-dist"
import type { TextItem } from "pdfjs-dist/types/src/display/api"

import type { ParsedTable } from "@/lib/import/parse-table"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()

interface PositionedItem {
  text: string
  x: number
  y: number
}

const ROW_Y_TOLERANCE = 4

// Best-effort table reconstruction from raw text positions - there is no
// real table model in a PDF, just positioned glyphs. This works well for
// a clean single-table export (e.g. "print to PDF" from a spreadsheet) and
// is NOT reliable for scanned/image-only PDFs (no OCR is performed - if a
// PDF has no extractable text layer, this throws) or complex multi-column
// layouts. Surfacing that limitation to the user is the wizard's job, not
// something this function should silently paper over.
export async function parsePdfTable(file: File): Promise<ParsedTable> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const items: PositionedItem[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    for (const entry of content.items) {
      if (!("str" in entry)) continue
      const textItem = entry as TextItem
      if (!textItem.str.trim()) continue
      items.push({ text: textItem.str, x: textItem.transform[4], y: textItem.transform[5] })
    }
  }

  if (items.length === 0) {
    throw new Error("No extractable text found in this PDF. Scanned or image-only PDFs aren't supported.")
  }

  const rowBuckets: PositionedItem[][] = []
  for (const item of items) {
    const bucket = rowBuckets.find((candidate) => Math.abs(candidate[0].y - item.y) <= ROW_Y_TOLERANCE)
    if (bucket) {
      bucket.push(item)
    } else {
      rowBuckets.push([item])
    }
  }

  // PDF y-coordinates increase upward - sort descending for reading order,
  // then left-to-right within each row.
  const orderedRows = rowBuckets.sort((a, b) => b[0].y - a[0].y).map((row) => [...row].sort((a, b) => a.x - b.x))

  if (orderedRows.length < 2) {
    throw new Error("Couldn't detect a table structure in this PDF.")
  }

  const headerRow = orderedRows[0]
  const headers = headerRow.map((item) => item.text.trim())

  const rows = orderedRows.slice(1).map((rowItems) => {
    const record: Record<string, string> = {}

    headerRow.forEach((headerItem, columnIndex) => {
      let closest: PositionedItem | null = null
      let closestDistance = Infinity

      for (const candidate of rowItems) {
        const distance = Math.abs(candidate.x - headerItem.x)
        if (distance < closestDistance) {
          closest = candidate
          closestDistance = distance
        }
      }

      record[headers[columnIndex]] = closest ? closest.text.trim() : ""
    })

    return record
  })

  return { headers, rows }
}
