import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { CreateUserDialog } from "@/components/settings/create-user-dialog"
import { UserAccountsTable } from "@/components/settings/user-accounts-table"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/profile"
import { getUnlinkedEmployees, getUserAccounts } from "@/lib/supabase/user-accounts"

export default async function UsersSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)

  // Same admin-only gate as the parent Settings page.
  if (profile.role !== "admin") {
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
