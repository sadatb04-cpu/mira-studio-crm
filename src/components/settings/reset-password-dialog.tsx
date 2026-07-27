"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { resetUserPassword } from "@/app/actions/user-accounts"

const PASSWORD_WORDS = ["Mira", "Studio", "Work", "Atelier", "Forge", "Gem"]
const PASSWORD_SYMBOLS = ["@", "#", "!", "$"]

function generatePassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)]
  const symbol = PASSWORD_SYMBOLS[Math.floor(Math.random() * PASSWORD_SYMBOLS.length)]
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${word}${symbol}${digits}`
}

interface ResetPasswordDialogProps {
  userId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResetPasswordDialog({ userId, userName, open, onOpenChange }: ResetPasswordDialogProps) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
  }

  function handleGeneratePassword() {
    const generated = generatePassword()
    setNewPassword(generated)
    setConfirmPassword(generated)
  }

  function handleSubmit() {
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    startTransition(async () => {
      const result = await resetUserPassword(userId, { newPassword, confirmPassword })

      if (result.error) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      reset()
      router.refresh()
      toast.success(`Password reset for ${userName}.`)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password - {userName}</DialogTitle>
          <DialogDescription>Assign a new password directly. The old password will no longer work.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password">
                New Password<span className="text-destructive">*</span>
              </Label>
              <Button type="button" variant="ghost" size="sm" className="h-auto gap-1 px-1.5 py-0.5 text-xs" onClick={handleGeneratePassword}>
                <Wand2 className="size-3" />
                Generate
              </Button>
            </div>
            <Input id="new-password" type="text" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-new-password">
              Confirm Password<span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-new-password"
              type="text"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">At least 8 characters, including one letter and one number.</p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
