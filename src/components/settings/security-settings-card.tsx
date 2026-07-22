"use client"

import { useState, useTransition } from "react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signOut } from "@/app/actions/auth"
import { changePassword } from "@/app/actions/settings"
import { DEPARTMENT_LABELS, USER_ROLE_LABELS } from "@/types/profile"
import type { Profile } from "@/types/profile"

interface SecuritySettingsCardProps {
  profile: Profile
}

export function SecuritySettingsCard({ profile }: SecuritySettingsCardProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChangePassword() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await changePassword({ newPassword, confirmPassword })
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
    })
  }

  return (
    <SectionCard title="Security" description="Your account and session.">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Current User</dt>
            <dd className="text-sm text-foreground">{profile.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Email</dt>
            <dd className="text-sm text-foreground">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Role</dt>
            <dd className="text-sm text-foreground">{USER_ROLE_LABELS[profile.role]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Department</dt>
            <dd className="text-sm text-foreground">{profile.department ? DEPARTMENT_LABELS[profile.department] : "Not set"}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">Change Password</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={handleChangePassword} disabled={isPending}>
              {isPending ? "Updating..." : "Change Password"}
            </Button>
            {success && <span className="text-sm text-muted-foreground">Password updated.</span>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center border-t border-border pt-4">
          <form action={signOut}>
            <Button type="submit" size="sm" variant="destructive">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </SectionCard>
  )
}
