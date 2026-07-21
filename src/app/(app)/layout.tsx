import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)

  return <AppShell profile={profile}>{children}</AppShell>
}
