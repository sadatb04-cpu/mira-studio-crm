"use client"

import { createContext, useContext } from "react"

import type { ModuleAction, PermissionModule, SpecialPermission, UserPermissions } from "@/types/permission"

const PermissionsContext = createContext<UserPermissions | null>(null)

interface PermissionsProviderProps {
  permissions: UserPermissions | null
  children: React.ReactNode
}

export function PermissionsProvider({ permissions, children }: PermissionsProviderProps) {
  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>
}

export function usePermissions(): UserPermissions | null {
  return useContext(PermissionsContext)
}

// Fails safe: if permissions haven't loaded for any reason, nothing is
// treated as permitted client-side. This only controls whether a button
// renders - every mutating action is re-checked server-side regardless.
export function useCanAccess(module: PermissionModule, action: ModuleAction): boolean {
  const permissions = usePermissions()
  if (!permissions) return false
  const modulePermission = permissions.modules[module]
  if (action === "view") return modulePermission.can_view
  if (action === "create") return modulePermission.can_create
  if (action === "edit") return modulePermission.can_edit
  return modulePermission.can_delete
}

export function useHasSpecialPermission(key: SpecialPermission): boolean {
  const permissions = usePermissions()
  if (!permissions) return false
  return permissions.special[key]
}
