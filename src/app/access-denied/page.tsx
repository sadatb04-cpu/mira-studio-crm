import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCachedUser } from "@/lib/supabase/server"
import { getCachedProfile } from "@/lib/supabase/profile"
import { getCachedUserPermissions } from "@/lib/supabase/permissions"
import { getFirstAccessibleRoute } from "@/lib/permission-routing"
import { signOut } from "@/app/actions/auth"

export default async function AccessDeniedPage() {
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  const [profile, permissions] = await Promise.all([getCachedProfile(user.id), getCachedUserPermissions(user.id)])

  // If something changed since they were sent here (an admin granted
  // access in the meantime), don't leave them stuck on this page.
  const accessibleRoute = getFirstAccessibleRoute(permissions, profile.role)
  if (accessibleRoute) {
    redirect(accessibleRoute)
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            <CardTitle className="text-lg">Access Denied</CardTitle>
          </div>
          <CardDescription>
            Your account ({profile.full_name}) has not been granted access to any module yet. Contact an administrator to
            request access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
