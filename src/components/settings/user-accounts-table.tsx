"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { KeyRound, Loader2, PauseCircle, ShieldCheck, ShieldOff, Users } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AccountStatusBadge } from "@/components/settings/account-status-badge"
import { ResetPasswordDialog } from "@/components/settings/reset-password-dialog"
import { setAccountStatus, updateUserRole } from "@/app/actions/user-accounts"
import { USER_ROLES, USER_ROLE_LABELS } from "@/types/profile"
import type { UserRole } from "@/types/profile"
import type { AccountStatus, UserAccountListItem } from "@/types/user-account"

interface UserAccountsTableProps {
  accounts: UserAccountListItem[]
}

export function UserAccountsTable({ accounts }: UserAccountsTableProps) {
  const router = useRouter()
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; status: AccountStatus } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(account: UserAccountListItem, role: UserRole) {
    if (role === account.role) return

    setError(null)
    setRoleUpdatingId(account.id)
    startTransition(async () => {
      const result = await updateUserRole(account.id, { role })
      setRoleUpdatingId(null)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      toast.success(`${account.full_name}'s role updated to ${USER_ROLE_LABELS[role]}.`)
    })
  }

  function handleStatusChange() {
    if (!confirmTarget) return
    setError(null)
    startTransition(async () => {
      const result = await setAccountStatus(confirmTarget.id, confirmTarget.status)
      if (result.error) {
        setError(result.error)
        setConfirmTarget(null)
        return
      }
      const target = confirmTarget
      setConfirmTarget(null)
      router.refresh()
      toast.success(`${target.name}'s account is now ${target.status}.`)
    })
  }

  if (accounts.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Users} title="No user accounts yet" description="Create one to grant CRM access." />
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard contentClassName="overflow-x-auto px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Linked Employee</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">{account.full_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{account.email}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={account.role}
                      onValueChange={(value) => handleRoleChange(account, value as UserRole)}
                      disabled={isPending && roleUpdatingId === account.id}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {USER_ROLE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isPending && roleUpdatingId === account.id && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{account.linkedEmployee?.full_name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <AccountStatusBadge status={account.accountStatus} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{format(new Date(account.createdAt), "MMM d, yyyy")}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Reset password"
                      onClick={() => setResetTarget({ id: account.id, name: account.full_name })}
                    >
                      <KeyRound className="size-3.5" />
                    </Button>

                    {account.accountStatus !== "active" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Reactivate account"
                        onClick={() => setConfirmTarget({ id: account.id, name: account.full_name, status: "active" })}
                      >
                        <ShieldCheck className="size-3.5" />
                      </Button>
                    )}

                    {account.accountStatus !== "suspended" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Suspend account"
                        onClick={() => setConfirmTarget({ id: account.id, name: account.full_name, status: "suspended" })}
                      >
                        <PauseCircle className="size-3.5" />
                      </Button>
                    )}

                    {account.accountStatus !== "disabled" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Disable account"
                        onClick={() => setConfirmTarget({ id: account.id, name: account.full_name, status: "disabled" })}
                      >
                        <ShieldOff className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {resetTarget && (
        <ResetPasswordDialog
          userId={resetTarget.id}
          userName={resetTarget.name}
          open={resetTarget !== null}
          onOpenChange={(next) => !next && setResetTarget(null)}
        />
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(next) => !next && setConfirmTarget(null)}
        title={
          confirmTarget?.status === "active"
            ? "Reactivate account"
            : confirmTarget?.status === "suspended"
              ? "Suspend account"
              : "Disable account"
        }
        description={
          confirmTarget
            ? confirmTarget.status === "active"
              ? `${confirmTarget.name} will be able to sign in again immediately.`
              : `${confirmTarget.name} will be signed out and unable to sign in until reactivated.`
            : undefined
        }
        confirmLabel={confirmTarget?.status === "active" ? "Reactivate" : "Confirm"}
        variant={confirmTarget?.status === "active" ? "default" : "destructive"}
        onConfirm={handleStatusChange}
        isConfirming={isPending}
      />
    </>
  )
}
