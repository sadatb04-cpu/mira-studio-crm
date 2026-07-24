"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  createDocumentFolder as createDocumentFolderQuery,
  deleteDocumentFolder as deleteDocumentFolderQuery,
  moveDocumentToFolder as moveDocumentToFolderQuery,
  updateDocumentFolder as updateDocumentFolderQuery,
} from "@/lib/supabase/document-folders"
import { documentFolderSchema } from "@/lib/validations/document-folder"
import type { DocumentFolderFormInput } from "@/types/document"

export interface DocumentFolderActionState {
  error?: string
}

export async function createDocumentFolder(
  input: DocumentFolderFormInput
): Promise<DocumentFolderActionState & { id?: string }> {
  const validated = documentFolderSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let folderId: string
  try {
    folderId = await createDocumentFolderQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create folder." }
  }

  revalidatePath("/documents")
  return { id: folderId }
}

export async function updateDocumentFolder(
  id: string,
  input: DocumentFolderFormInput
): Promise<DocumentFolderActionState> {
  const validated = documentFolderSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateDocumentFolderQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update folder." }
  }

  revalidatePath("/documents")
  revalidatePath(`/documents/folders/${id}`)
  return {}
}

export async function deleteDocumentFolder(id: string): Promise<DocumentFolderActionState> {
  const supabase = await createClient()

  try {
    await deleteDocumentFolderQuery(supabase, id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete folder." }
  }

  revalidatePath("/documents")
  return {}
}

export async function moveDocumentToFolder(
  documentId: string,
  folderId: string | null
): Promise<DocumentFolderActionState> {
  const supabase = await createClient()

  try {
    await moveDocumentToFolderQuery(supabase, documentId, folderId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to move document." }
  }

  revalidatePath("/documents")
  revalidatePath(`/documents/${documentId}`)
  return {}
}
