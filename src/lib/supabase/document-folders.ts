import type { SupabaseClient } from "@supabase/supabase-js"

import type { DocumentFolderFormInput, DocumentFolderSummary, FolderOption } from "@/types/document"

async function logFolderActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Best-effort only, matching the rest of the documents module - never
  // fail the surrounding folder operation if logging fails.
  await supabase.from("activity_logs").insert({
    entity_type: "document_folder",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function getFolderOptions(supabase: SupabaseClient): Promise<FolderOption[]> {
  const { data, error } = await supabase.from("document_folders").select("id, name").order("name")
  if (error) throw error
  return data ?? []
}

export async function getDocumentFolders(supabase: SupabaseClient): Promise<DocumentFolderSummary[]> {
  const [foldersResult, docsResult] = await Promise.all([
    supabase.from("document_folders").select("id, name, description, created_at, updated_at").order("name"),
    supabase.from("documents").select("folder_id, file_size").not("folder_id", "is", null),
  ])

  if (foldersResult.error) throw foldersResult.error
  if (docsResult.error) throw docsResult.error

  const statsByFolder = new Map<string, { count: number; bytes: number }>()
  for (const doc of docsResult.data ?? []) {
    const key = doc.folder_id as string
    const existing = statsByFolder.get(key) ?? { count: 0, bytes: 0 }
    existing.count += 1
    existing.bytes += doc.file_size ?? 0
    statsByFolder.set(key, existing)
  }

  return (foldersResult.data ?? []).map((folder) => ({
    ...folder,
    documentCount: statsByFolder.get(folder.id)?.count ?? 0,
    storageBytes: statsByFolder.get(folder.id)?.bytes ?? 0,
  }))
}

export async function getDocumentFolder(supabase: SupabaseClient, id: string): Promise<DocumentFolderSummary | null> {
  const { data, error } = await supabase
    .from("document_folders")
    .select("id, name, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Folder-wide totals are computed independently of any list-level
  // filters (search/type/date) applied to the documents table below them,
  // so they always reflect everything in the folder, not just what's
  // currently visible.
  const { data: docs, error: docsError } = await supabase.from("documents").select("file_size").eq("folder_id", id)
  if (docsError) throw docsError

  return {
    ...data,
    documentCount: (docs ?? []).length,
    storageBytes: (docs ?? []).reduce((sum, doc) => sum + (doc.file_size ?? 0), 0),
  }
}

export async function createDocumentFolder(supabase: SupabaseClient, input: DocumentFolderFormInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("document_folders")
    .insert({ name: input.name, description: input.description || null, created_by: user?.id ?? null })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("A folder with this name already exists.")
    throw error
  }

  const folderId = data.id as string
  await logFolderActivity(supabase, { entity_id: folderId, action: "folder_created", description: `Created folder "${input.name}".` })

  return folderId
}

export async function updateDocumentFolder(
  supabase: SupabaseClient,
  id: string,
  input: DocumentFolderFormInput
): Promise<void> {
  const { error } = await supabase
    .from("document_folders")
    .update({ name: input.name, description: input.description || null })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") throw new Error("A folder with this name already exists.")
    throw error
  }

  await logFolderActivity(supabase, { entity_id: id, action: "folder_renamed", description: `Renamed folder to "${input.name}".` })
}

export async function deleteDocumentFolder(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: folder, error: fetchError } = await supabase
    .from("document_folders")
    .select("name")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!folder) return

  // documents.folder_id references document_folders with ON DELETE SET
  // NULL, so removing the folder automatically clears folder_id on every
  // document inside it at the database level - no document row is ever
  // deleted, and there's nothing extra to do here first.
  const { error } = await supabase.from("document_folders").delete().eq("id", id)
  if (error) throw error

  await logFolderActivity(supabase, { entity_id: id, action: "folder_deleted", description: `Deleted folder "${folder.name}".` })
}

export async function moveDocumentToFolder(
  supabase: SupabaseClient,
  documentId: string,
  folderId: string | null
): Promise<void> {
  const { error } = await supabase.from("documents").update({ folder_id: folderId }).eq("id", documentId)
  if (error) throw error

  let folderName: string | null = null
  if (folderId) {
    const { data } = await supabase.from("document_folders").select("name").eq("id", folderId).maybeSingle()
    folderName = data?.name ?? null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "document",
    entity_id: documentId,
    action: "moved",
    description: folderName ? `Moved to the "${folderName}" folder.` : "Removed from folder.",
    actor_id: user?.id ?? null,
  })
}
