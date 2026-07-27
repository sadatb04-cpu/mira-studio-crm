"use server"

import { createClient } from "@/lib/supabase/server"
import { changeOwnPassword } from "@/lib/supabase/profile"
import { changeOwnPasswordSchema } from "@/lib/validations/profile"
import type { ChangeOwnPasswordInput } from "@/lib/validations/profile"

export interface ProfileActionState {
  error?: string
}

export async function changeMyPassword(input: ChangeOwnPasswordInput): Promise<ProfileActionState> {
  const validated = changeOwnPasswordSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { error: "You must be signed in." }
  }

  try {
    await changeOwnPassword(supabase, user.id, user.email, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to change password." }
  }

  return {}
}
