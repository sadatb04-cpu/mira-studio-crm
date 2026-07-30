import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { AppShell } from "@/components/layout/app-shell"
import { SplashScreen } from "@/components/layout/splash-screen"
import { getCachedUser } from "@/lib/supabase/server"
import { getCachedProfile } from "@/lib/supabase/profile"
import { getCachedUserPermissions } from "@/lib/supabase/permissions"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  // Both requests are request-memoized (see server.ts/profile.ts/permissions.ts)
  // and independent of each other, so they run concurrently rather than as a
  // second sequential round trip.
  const [profile, permissions] = await Promise.all([getCachedProfile(user.id), getCachedUserPermissions(user.id)])
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
