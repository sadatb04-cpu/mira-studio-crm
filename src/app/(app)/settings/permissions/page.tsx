import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { UserAccessTable } from "@/components/settings/user-access-table"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAllUserPermissions, getUserAccessList, getUserPermissions } from "@/lib/supabase/permissions"

export default async function PermissionsSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const viewerPermissions = await getUserPermissions(supabase, user.id)

  // Admins always qualify; a non-admin can too if explicitly granted the
  // "Manage Permissions" special permission.
  if (!viewerPermissions.isAdmin && !viewerPermissions.special.manage_permissions) {
    notFound()
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role, special_permissions")
    .order("created_at")

  if (profilesError) throw profilesError

  const adminClient = createAdminClient()
  const [users, permissionsMap] = await Promise.all([
    getUserAccessList(adminClient, supabase),
    getAllUserPermissions(supabase, profiles ?? []),
  ])

  const permissionsByUserId = Object.fromEntries(permissionsMap)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link
        href="/settings"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Back to Settings
      </Link>

      <PageHeader
        title="User Access"
        description="Roles are defaults - these permissions determine actual module and action access."
      />

      <UserAccessTable users={users} permissionsByUserId={permissionsByUserId} />
    </div>
  )
}
