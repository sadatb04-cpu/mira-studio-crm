import { redirect } from "next/navigation"

import { getCachedUser } from "@/lib/supabase/server"
import { getCachedProfile } from "@/lib/supabase/profile"
import { canAccessModule, getCachedUserPermissions } from "@/lib/supabase/permissions"
import { getFirstAccessibleRoute } from "@/lib/permission-routing"
import type { ModuleAction, PermissionModule } from "@/types/permission"

// Generic page guard for any module's own route - nothing here is
// specific to Dashboard, Tasks, or any other single module. Redirects to
// the first module the user can actually view, or /access-denied if
// there is none, rather than rendering a page for an action they don't
// have permission for.
//
// Every one of these calls is request-memoized (getCachedUser/getCachedProfile/
// getCachedUserPermissions) - this guard runs on literally every page, right
// alongside (app)/layout.tsx's own identical checks, so without caching this
// was one of the biggest sources of duplicate profiles/user_permissions reads
// per page load.
export async function requirePagePermission(module: PermissionModule, action: ModuleAction = "view"): Promise<void> {
  const user = await getCachedUser()

  if (!user) redirect("/login")

  const [profile, permissions] = await Promise.all([getCachedProfile(user.id), getCachedUserPermissions(user.id)])

  if (canAccessModule(permissions, module, action)) return

  const fallback = getFirstAccessibleRoute(permissions, profile.role)
  redirect(fallback ?? "/access-denied")
}

export async function requirePageView(module: PermissionModule): Promise<void> {
  return requirePagePermission(module, "view")
}
