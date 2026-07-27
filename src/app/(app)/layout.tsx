import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { AppShell } from "@/components/layout/app-shell"
import { SplashScreen } from "@/components/layout/splash-screen"
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
  const cookieStore = await cookies()
  const showSplash = cookieStore.get("mira-show-splash")?.value === "1"

  return (
    <>
      <SplashScreen show={showSplash} />
      <AppShell profile={profile} permissions={permissions}>
        {children}
      </AppShell>
    </>
  )
}
