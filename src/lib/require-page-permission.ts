import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { canAccessModule, getUserPermissions } from "@/lib/supabase/permissions"
import { getFirstAccessibleRoute } from "@/lib/permission-routing"
import type { ModuleAction, PermissionModule } from "@/types/permission"

// Generic page guard for any module's own route - nothing here is
// specific to Dashboard, Tasks, or any other single module. Redirects to
// the first module the user can actually view, or /access-denied if
// there is none, rather than rendering a page for an action they don't
// have permission for.
export async function requirePagePermission(module: PermissionModule, action: ModuleAction = "view"): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await getProfile(supabase, user.id)
  const permissions = await getUserPermissions(supabase, user.id)

  if (canAccessModule(permissions, module, action)) return

  const fallback = getFirstAccessibleRoute(permissions, profile.role)
  redirect(fallback ?? "/access-denied")
}

export async function requirePageView(module: PermissionModule): Promise<void> {
  return requirePagePermission(module, "view")
}
