import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { getUserPermissions } from "@/lib/supabase/permissions"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)
  const permissions = await getUserPermissions(supabase, user.id)

  return (
    <AppShell profile={profile} permissions={permissions}>
      {children}
    </AppShell>
  )
}
