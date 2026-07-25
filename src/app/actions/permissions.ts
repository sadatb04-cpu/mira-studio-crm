"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireAdminOrSpecialPermission } from "@/lib/supabase/permissions"
import {
  applyRoleTemplate as applyRoleTemplateQuery,
  updateModulePermissions as updateModulePermissionsQuery,
  updateSpecialPermissions as updateSpecialPermissionsQuery,
} from "@/lib/supabase/permissions"
import type { ModulePermission, PermissionModule, SpecialPermission } from "@/types/permission"

export interface PermissionActionState {
  error?: string
}

export async function updateModulePermissions(
  targetProfileId: string,
  modules: Record<PermissionModule, ModulePermission>
): Promise<PermissionActionState> {
  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_permissions")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  try {
    await updateModulePermissionsQuery(supabase, targetProfileId, modules, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update permissions." }
  }

  revalidatePath("/settings/permissions")
  return {}
}

export async function updateSpecialPermissions(
  targetProfileId: string,
  special: Record<SpecialPermission, boolean>
): Promise<PermissionActionState> {
  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_permissions")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  try {
    await updateSpecialPermissionsQuery(supabase, targetProfileId, special, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update special permissions." }
  }

  revalidatePath("/settings/permissions")
  return {}
}

export async function applyRoleTemplate(targetProfileId: string, templateKey: string): Promise<PermissionActionState> {
  const supabase = await createClient()

  let admin: { id: string }
  try {
    admin = await requireAdminOrSpecialPermission(supabase, "manage_permissions")
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not authorized." }
  }

  try {
    await applyRoleTemplateQuery(supabase, targetProfileId, templateKey, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to apply role template." }
  }

  revalidatePath("/settings/permissions")
  return {}
}
