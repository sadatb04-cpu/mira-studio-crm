import { createClient } from "@/lib/supabase/client"

// Same bucket every other per-record attachment in this app uses (see
// documents.ts) - no dedicated "finance" bucket, so no Storage
// bucket/policy migration is needed.
const BUCKET = "documents"

export async function uploadFinanceFile(file: File): Promise<{ storagePath: string; error?: undefined } | { storagePath?: undefined; error: string }> {
  const supabase = createClient()
  const storagePath = `${crypto.randomUUID()}/${file.name}`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type })
  if (error) return { error: error.message }

  return { storagePath }
}
