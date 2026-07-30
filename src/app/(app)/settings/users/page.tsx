import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { CreateUserDialog } from "@/components/settings/create-user-dialog"
import { UserAccountsTable } from "@/components/settings/user-accounts-table"
import { createClient, getCachedUser } from "@/lib/supabase/server"
import { getUnlinkedEmployees, getUserAccounts } from "@/lib/supabase/user-accounts"
import { getCachedUserPermissions } from "@/lib/supabase/permissions"

export default async function UsersSettingsPage() {
  const supabase = await createClient()
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  const permissions = await getCachedUserPermissions(user.id)

  // Admins always qualify; a non-admin can too if explicitly granted the
  // "Manage Users" special permission.
  if (!permissions.isAdmin && !permissions.special.manage_users) {
    notFound()
  }

  const [accounts, unlinkedEmployees] = await Promise.all([getUserAccounts(supabase), getUnlinkedEmployees(supabase)])

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
        title="Users"
        description="CRM access is invite-only. Create, link, and manage user accounts here."
        actions={<CreateUserDialog unlinkedEmployees={unlinkedEmployees} />}
      />

      <UserAccountsTable accounts={accounts} />
    </div>
  )
}
