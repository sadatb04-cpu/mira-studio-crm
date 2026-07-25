"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission, requireSpecialPermission } from "@/lib/supabase/permissions"
import {
  createDocumentRecord,
  deleteDocument as deleteDocumentQuery,
  getDownloadUrl,
} from "@/lib/supabase/documents"
import { createDocumentSchema } from "@/lib/validations/document"
import type { CreateDocumentInput } from "@/lib/validations/document"

export interface DocumentActionState {
  error?: string
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentActionState & { id?: string }> {
  const validated = createDocumentSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let documentId: string
  try {
    await requireModulePermission(supabase, "documents", "create")
    documentId = await createDocumentRecord(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save document." }
  }

  revalidatePath("/documents")
  return { id: documentId }
}

// Gated by the "Delete Documents" special permission rather than the
// documents module's own can_delete flag - that flag is reserved for
// folder deletion (see document-folders.ts), keeping actual file deletion
// (irreversible, removes the Storage object) behind its own explicit grant.
export async function deleteDocument(id: string): Promise<DocumentActionState> {
  const supabase = await createClient()

  try {
    await requireSpecialPermission(supabase, "delete_documents")
    await deleteDocumentQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete document." }
  }

  revalidatePath("/documents")
  return {}
}

export async function downloadDocument(id: string): Promise<DocumentActionState & { signedUrl?: string; fileName?: string }> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "documents", "view")
    const { signedUrl, fileName } = await getDownloadUrl(supabase, id)
    return { signedUrl, fileName }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate download link." }
  }
}
