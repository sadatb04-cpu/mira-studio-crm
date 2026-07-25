"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ShieldCheck, Users } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { AccountStatusBadge } from "@/components/settings/account-status-badge"
import { PermissionsDrawer } from "@/components/settings/permissions-drawer"
import { USER_ROLE_LABELS } from "@/types/profile"
import type { UserAccessListItem } from "@/types/permission"
import type { UserPermissions } from "@/types/permission"

interface UserAccessTableProps {
  users: UserAccessListItem[]
  permissionsByUserId: Record<string, UserPermissions>
}

export function UserAccessTable({ users, permissionsByUserId }: UserAccessTableProps) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const activeUser = users.find((user) => user.id === activeUserId) ?? null

  if (users.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Users} title="No user accounts yet" />
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard contentClassName="overflow-x-auto px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2">Employee Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last Login</th>
              <th className="px-4 py-2 text-right">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">{user.full_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{USER_ROLE_LABELS[user.role]}</td>
                <td className="px-4 py-2.5">
                  <AccountStatusBadge status={user.accountStatus} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {user.lastSignInAt ? format(new Date(user.lastSignInAt), "MMM d, yyyy h:mm a") : "Never"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveUserId(user.id)}>
                    <ShieldCheck className="size-3.5" data-icon="inline-start" />
                    Permissions
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {activeUser && permissionsByUserId[activeUser.id] && (
        <PermissionsDrawer
          userId={activeUser.id}
          userName={activeUser.full_name}
          isAdmin={permissionsByUserId[activeUser.id].isAdmin}
          permissions={permissionsByUserId[activeUser.id]}
          open={activeUserId !== null}
          onOpenChange={(next) => !next && setActiveUserId(null)}
        />
      )}
    </>
  )
}
