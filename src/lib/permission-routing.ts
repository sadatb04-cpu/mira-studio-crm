import { navigationItems } from "@/config/navigation"
import type { UserRole } from "@/types/profile"
import type { UserPermissions } from "@/types/permission"

// Generic by design - it has no idea Dashboard exists as anything other
// than the first entry in navigationItems. Whichever module a user has
// View for, in nav order, is where they land; if none, there is nowhere
// to send them.
export function getFirstAccessibleRoute(permissions: UserPermissions, role: UserRole | null): string | null {
  for (const item of navigationItems) {
    if (item.roles && (!role || !item.roles.includes(role))) continue
    if (!item.permissionModule) continue
    if (permissions.modules[item.permissionModule].can_view) return item.href
  }
  return null
}
