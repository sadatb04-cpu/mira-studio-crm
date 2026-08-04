"use server"

import { createClient } from "@/lib/supabase/server"
import { requireModulePermission } from "@/lib/supabase/permissions"

const BUCKET = "documents"
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10

export interface FinanceAttachmentUrlResult {
  signedUrl?: string
  error?: string
}

// Shared by every Finance list/table (manufacturer invoices, seller
// invoices, expenses) - a signed URL for an uploaded file's Storage path.
// Not used for the Google Sheets link alternative, which is already a
// plain external URL and opens directly.
export async function getFinanceAttachmentUrl(storagePath: string): Promise<FinanceAttachmentUrlResult> {
  const supabase = await createClient()

  try {
    await requireModulePermission(supabase, "finance", "view")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to open attachment." }
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)
  if (error) return { error: error.message }

  return { signedUrl: data.signedUrl }
}
