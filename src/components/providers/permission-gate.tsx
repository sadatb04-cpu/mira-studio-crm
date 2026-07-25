"use client"

import { useCanAccess, useHasSpecialPermission } from "@/components/providers/permissions-provider"
import type { ModuleAction, PermissionModule, SpecialPermission } from "@/types/permission"

interface ModuleGateProps {
  module: PermissionModule
  action: ModuleAction
  /** Also allow through if the user has this special permission, even without the module grant (mirrors requireModuleOrSpecialPermission on the server). */
  orSpecial?: SpecialPermission
  special?: never
  children: React.ReactNode
}

interface SpecialGateProps {
  module?: never
  action?: never
  orSpecial?: never
  special: SpecialPermission
  children: React.ReactNode
}

// Hides children the current user isn't permitted to see/use - buttons
// like "New Order" or "Delete" disappear entirely rather than just being
// disabled. This is a UI convenience only: every mutating server action
// re-checks the same permission independently, so this gate is never the
// actual security boundary.
export function PermissionGate(props: ModuleGateProps | SpecialGateProps) {
  const moduleAllowed = useCanAccess(props.module ?? "dashboard", props.action ?? "view")
  const specialAllowed = useHasSpecialPermission(props.special ?? props.orSpecial ?? "manage_permissions")

  const allowed = props.special ? specialAllowed : props.orSpecial ? moduleAllowed || specialAllowed : moduleAllowed
  if (!allowed) return null

  return <>{props.children}</>
}
