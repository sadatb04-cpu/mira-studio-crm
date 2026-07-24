import { z } from "zod"

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  RELATED_RECORD_TYPES,
} from "@/types/document"

export const documentMetadataSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES, { error: "Select a document type." }),
    description: z.string().trim().min(1, { error: "Description is required." }),
    relatedRecordType: z.enum(RELATED_RECORD_TYPES).optional(),
    relatedRecordId: z.string().trim().optional(),
    folderId: z.string().trim().optional(),
  })
  .refine((data) => !data.relatedRecordType || !!data.relatedRecordId, {
    error: "Select a related record.",
    path: ["relatedRecordId"],
  })

export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>

// Validates the file's own metadata (name/size/type) - the actual bytes
// are uploaded directly to Storage from the client, not through this
// schema, and createDocumentSchema below validates the full submission
// once that upload has already produced a storage path.
export const documentFileSchema = z.object({
  fileName: z.string().trim().min(1, { error: "File is required." }),
  fileSize: z
    .number()
    .positive({ error: "File is required." })
    .max(MAX_DOCUMENT_FILE_SIZE_BYTES, { error: "File must be 25 MB or smaller." }),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES, { error: "Unsupported file type." }),
})

export type DocumentFileInput = z.infer<typeof documentFileSchema>

export const createDocumentSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES, { error: "Select a document type." }),
    description: z.string().trim().min(1, { error: "Description is required." }),
    relatedRecordType: z.enum(RELATED_RECORD_TYPES).optional(),
    relatedRecordId: z.string().trim().optional(),
    folderId: z.string().trim().optional(),
    fileName: z.string().trim().min(1, { error: "File is required." }),
    fileSize: z
      .number()
      .positive({ error: "File is required." })
      .max(MAX_DOCUMENT_FILE_SIZE_BYTES, { error: "File must be 25 MB or smaller." }),
    mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES, { error: "Unsupported file type." }),
    storagePath: z.string().trim().min(1, { error: "Upload did not complete correctly." }),
  })
  .refine((data) => !data.relatedRecordType || !!data.relatedRecordId, {
    error: "Select a related record.",
    path: ["relatedRecordId"],
  })

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
