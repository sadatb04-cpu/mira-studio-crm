import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient, getCachedUser } from "@/lib/supabase/server"
import {
  NO_MODULE_ACCESS,
  PERMISSION_MODULES,
  ROLE_TEMPLATES,
  SPECIAL_PERMISSIONS,
} from "@/types/permission"
import type { ModuleAction, ModulePermission, PermissionModule, SpecialPermission, UserAccessListItem, UserPermissions } from "@/types/permission"

interface RawPermissionRow {
  module: PermissionModule
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

function emptyModuleMap(): Record<PermissionModule, ModulePermission> {
  return Object.fromEntries(PERMISSION_MODULES.map((module) => [module, { ...NO_MODULE_ACCESS }])) as Record<
    PermissionModule,
    ModulePermission
  >
}

function emptySpecialMap(): Record<SpecialPermission, boolean> {
  return Object.fromEntries(SPECIAL_PERMISSIONS.map((key) => [key, false])) as Record<SpecialPermission, boolean>
}

// The single source of truth for what a user can do. Admins always get
// full access regardless of what's stored - a missing/misconfigured
// permission row can never lock an admin out. Every other module,
// including Dashboard, is governed purely by the stored grid - no module
// is forced on, and none is exempt from being turned off.
export async function getUserPermissions(supabase: SupabaseClient, profileId: string): Promise<UserPermissions> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, special_permissions")
    .eq("id", profileId)
    .single()

  if (profileError) throw profileError

  if (profile.role === "admin") {
    const modules = emptyModuleMap()
    for (const mod of PERMISSION_MODULES) modules[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true }
    const special = emptySpecialMap()
    for (const key of SPECIAL_PERMISSIONS) special[key] = true
    return { isAdmin: true, modules, special }
  }

  const { data: rows, error: rowsError } = await supabase
    .from("user_permissions")
    .select("module, can_view, can_create, can_edit, can_delete")
    .eq("profile_id", profileId)

  if (rowsError) throw rowsError

  const modules = emptyModuleMap()
  for (const row of (rows ?? []) as RawPermissionRow[]) {
    modules[row.module] = { can_view: row.can_view, can_create: row.can_create, can_edit: row.can_edit, can_delete: row.can_delete }
  }

  const special = emptySpecialMap()
  const stored = (profile.special_permissions ?? {}) as Partial<Record<SpecialPermission, boolean>>
  for (const key of SPECIAL_PERMISSIONS) special[key] = stored[key] ?? false

  return { isAdmin: false, modules, special }
}

// Per-request memoization, same reasoning as getCachedUser()/getCachedProfile()
// - keyed on profileId (a primitive), so every requireXPermission check and
// every page guard in the same request shares one database read instead of
// each re-running getUserPermissions() from scratch.
export const getCachedUserPermissions = cache(async (profileId: string): Promise<UserPermissions> => {
  const supabase = await createClient()
  return getUserPermissions(supabase, profileId)
})

export function canAccessModule(permissions: UserPermissions, module: PermissionModule, action: ModuleAction): boolean {
  const modulePermission = permissions.modules[module]
  if (action === "view") return modulePermission.can_view
  if (action === "create") return modulePermission.can_create
  if (action === "edit") return modulePermission.can_edit
  return modulePermission.can_delete
}

export function hasSpecialPermission(permissions: UserPermissions, key: SpecialPermission): boolean {
  return permissions.special[key]
}

// Every gated server action calls this first. Resolves the CURRENT
// session server-side (never trusts a client-supplied id/role) and throws
// a plain Error if the action isn't permitted - callers surface it as
// { error: error.message } exactly like every other action in this app.
//
// Goes through getCachedUser()/getCachedUserPermissions() rather than the
// passed-in `supabase` client: auth/RLS are keyed off the request's session
// cookies, not which client instance asks, so this is behaviorally identical
// to calling supabase.auth.getUser() directly - it just shares the result
// with every other permission check in the same request instead of hitting
// the database again. `supabase` stays in the signature so none of this
// function's 90+ call sites need to change.
export async function requireModulePermission(
  supabase: SupabaseClient,
  module: PermissionModule,
  action: ModuleAction
): Promise<{ userId: string }> {
  const user = await getCachedUser()

  if (!user) throw new Error("You must be signed in.")

  const permissions = await getCachedUserPermissions(user.id)
  if (!canAccessModule(permissions, module, action)) {
    throw new Error("You don't have permission to perform this action.")
  }

  return { userId: user.id }
}

// "Manage Employees"/"Manage Users"/"Manage Permissions" act as umbrella
// overrides on top of the granular module table - a user with the special
// flag gets the action even if their per-module grid says otherwise.
export async function requireModuleOrSpecialPermission(
  supabase: SupabaseClient,
  module: PermissionModule,
  action: ModuleAction,
  specialKey: SpecialPermission
): Promise<{ userId: string }> {
  const user = await getCachedUser()

  if (!user) throw new Error("You must be signed in.")

  const permissions = await getCachedUserPermissions(user.id)
  if (!canAccessModule(permissions, module, action) && !hasSpecialPermission(permissions, specialKey)) {
    throw new Error("You don't have permission to perform this action.")
  }

  return { userId: user.id }
}

export async function requireSpecialPermission(supabase: SupabaseClient, key: SpecialPermission): Promise<{ userId: string }> {
  const user = await getCachedUser()

  if (!user) throw new Error("You must be signed in.")

  const permissions = await getCachedUserPermissions(user.id)
  if (!hasSpecialPermission(permissions, key)) {
    throw new Error("You don't have permission to perform this action.")
  }

  return { userId: user.id }
}

// For the Admin-API-backed actions (user account lifecycle, permission
// management itself) - admins always qualify; a non-admin can also
// qualify if explicitly granted the matching special permission
// ("Manage Users" / "Manage Permissions"), which is the whole point of
// those being grantable special permissions rather than admin-only.
export async function requireAdminOrSpecialPermission(
  supabase: SupabaseClient,
  key: SpecialPermission
): Promise<{ id: string; email: string }> {
  const user = await getCachedUser()

  if (!user) throw new Error("You must be signed in.")

  const permissions = await getCachedUserPermissions(user.id)
  if (!permissions.isAdmin && !hasSpecialPermission(permissions, key)) {
    throw new Error("You don't have permission to perform this action.")
  }

  return { id: user.id, email: user.email ?? "" }
}

async function logPermissionActivity(
  supabase: SupabaseClient,
  entry: { entity_id: string; action: string; description: string; actor_id: string }
) {
  // Best-effort only, matching the non-throwing activity logging pattern
  // used throughout the app.
  await supabase.from("activity_logs").insert({
    entity_type: "profile",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description,
    actor_id: entry.actor_id,
  })
}

export async function updateModulePermissions(
  supabase: SupabaseClient,
  targetProfileId: string,
  modules: Record<PermissionModule, ModulePermission>,
  actorId: string
): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("user_permissions")
    .select("module, can_view, can_create, can_edit, can_delete")
    .eq("profile_id", targetProfileId)

  if (fetchError) throw fetchError

  const existing = new Map(((existingRows ?? []) as RawPermissionRow[]).map((row) => [row.module, row]))

  const { error: upsertError } = await supabase.from("user_permissions").upsert(
    PERMISSION_MODULES.map((mod) => ({
      profile_id: targetProfileId,
      module: mod,
      can_view: modules[mod].can_view,
      can_create: modules[mod].can_create,
      can_edit: modules[mod].can_edit,
      can_delete: modules[mod].can_delete,
    })),
    { onConflict: "profile_id,module" }
  )

  if (upsertError) throw upsertError

  for (const mod of PERMISSION_MODULES) {
    const before = existing.get(mod) ?? { can_view: false, can_create: false, can_edit: false, can_delete: false }
    const after = modules[mod]
    const changed =
      before.can_view !== after.can_view ||
      before.can_create !== after.can_create ||
      before.can_edit !== after.can_edit ||
      before.can_delete !== after.can_delete

    if (!changed) continue

    const action = !before.can_view && after.can_view ? "user_access_granted" : before.can_view && !after.can_view ? "user_access_revoked" : "permission_changed"

    await logPermissionActivity(supabase, {
      entity_id: targetProfileId,
      action,
      description: `${mod} permissions changed from view:${before.can_view}/create:${before.can_create}/edit:${before.can_edit}/delete:${before.can_delete} to view:${after.can_view}/create:${after.can_create}/edit:${after.can_edit}/delete:${after.can_delete}.`,
      actor_id: actorId,
    })
  }
}

export async function updateSpecialPermissions(
  supabase: SupabaseClient,
  targetProfileId: string,
  special: Record<SpecialPermission, boolean>,
  actorId: string
): Promise<void> {
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("special_permissions")
    .eq("id", targetProfileId)
    .single()

  if (fetchError) throw fetchError

  const before = (profile.special_permissions ?? {}) as Partial<Record<SpecialPermission, boolean>>

  const { error: updateError } = await supabase.from("profiles").update({ special_permissions: special }).eq("id", targetProfileId)
  if (updateError) throw updateError

  const changedKeys = SPECIAL_PERMISSIONS.filter((key) => Boolean(before[key]) !== special[key])
  if (changedKeys.length === 0) return

  await logPermissionActivity(supabase, {
    entity_id: targetProfileId,
    action: "permission_changed",
    description: `Special permissions changed: ${changedKeys.map((key) => `${key} ${special[key] ? "granted" : "revoked"}`).join(", ")}.`,
    actor_id: actorId,
  })
}

export async function applyRoleTemplate(
  supabase: SupabaseClient,
  targetProfileId: string,
  templateKey: string,
  actorId: string
): Promise<void> {
  const template = ROLE_TEMPLATES.find((candidate) => candidate.key === templateKey)
  if (!template) throw new Error("Unknown role template.")

  const modules = emptyModuleMap()
  for (const [module, access] of Object.entries(template.modulePermissions)) {
    modules[module as PermissionModule] = access as ModulePermission
  }

  const special = emptySpecialMap()
  for (const key of template.special) special[key] = true

  await updateModulePermissions(supabase, targetProfileId, modules, actorId)
  await updateSpecialPermissions(supabase, targetProfileId, special, actorId)

  await logPermissionActivity(supabase, {
    entity_id: targetProfileId,
    action: "role_template_applied",
    description: `Applied the "${template.label}" permission template.`,
    actor_id: actorId,
  })
}

// Bulk variant of getUserPermissions() for the User Access list page, which
// needs every user's permissions up front to populate their drawer without
// a per-user round trip when it opens. One query for all rows, grouped in
// JS - same "fetch simple, combine in JS" approach used elsewhere.
export async function getAllUserPermissions(
  supabase: SupabaseClient,
  profiles: { id: string; role: string; special_permissions: unknown }[]
): Promise<Map<string, UserPermissions>> {
  const nonAdminIds = profiles.filter((profile) => profile.role !== "admin").map((profile) => profile.id)

  const { data: rows, error } =
    nonAdminIds.length > 0
      ? await supabase.from("user_permissions").select("profile_id, module, can_view, can_create, can_edit, can_delete").in("profile_id", nonAdminIds)
      : { data: [] as { profile_id: string; module: PermissionModule; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[], error: null }

  if (error) throw error

  const rowsByProfile = new Map<string, RawPermissionRow[]>()
  for (const row of rows ?? []) {
    const list = rowsByProfile.get(row.profile_id) ?? []
    list.push(row)
    rowsByProfile.set(row.profile_id, list)
  }

  const result = new Map<string, UserPermissions>()
  for (const profile of profiles) {
    if (profile.role === "admin") {
      const modules = emptyModuleMap()
      for (const mod of PERMISSION_MODULES) modules[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true }
      const special = emptySpecialMap()
      for (const key of SPECIAL_PERMISSIONS) special[key] = true
      result.set(profile.id, { isAdmin: true, modules, special })
      continue
    }

    const modules = emptyModuleMap()
    for (const row of rowsByProfile.get(profile.id) ?? []) {
      modules[row.module] = { can_view: row.can_view, can_create: row.can_create, can_edit: row.can_edit, can_delete: row.can_delete }
    }

    const special = emptySpecialMap()
    const stored = (profile.special_permissions ?? {}) as Partial<Record<SpecialPermission, boolean>>
    for (const key of SPECIAL_PERMISSIONS) special[key] = stored[key] ?? false

    result.set(profile.id, { isAdmin: false, modules, special })
  }

  return result
}

export async function getUserAccessList(adminClient: SupabaseClient, supabase: SupabaseClient): Promise<UserAccessListItem[]> {
  const [{ data: profiles, error: profilesError }, { data: usersPage, error: usersError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, account_status").order("created_at"),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  if (profilesError) throw profilesError
  if (usersError) throw usersError

  const lastSignInById = new Map((usersPage?.users ?? []).map((authUser) => [authUser.id, authUser.last_sign_in_at ?? null]))

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    accountStatus: profile.account_status,
    lastSignInAt: lastSignInById.get(profile.id) ?? null,
  }))
}
