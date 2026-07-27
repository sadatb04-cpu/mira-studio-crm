"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changeMyPassword } from "@/app/actions/profile"

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    startTransition(async () => {
      const result = await changeMyPassword({ currentPassword, newPassword, confirmPassword })

      if (result.error) {
        setError(result.error)
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated.")
    })
  }

  return (
    <SectionCard title="Change Password" description="Enter your current password to confirm it's you.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="current-password">
            Current Password<span className="text-destructive">*</span>
          </Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:max-w-lg sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">
              New Password<span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">
              Confirm New Password<span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">At least 8 characters, including one letter and one number.</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" size="sm" className="self-start" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Updating..." : "Change Password"}
        </Button>
      </div>
    </SectionCard>
  )
}
