"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createUserAccount } from "@/app/actions/user-accounts"
import { DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, USER_ROLE_LABELS } from "@/types/profile"
import type { Department, UserRole } from "@/types/profile"
import type { UnlinkedEmployeeOption } from "@/types/user-account"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface CreateUserDialogProps {
  unlinkedEmployees: UnlinkedEmployeeOption[]
}

export function CreateUserDialog({ unlinkedEmployees }: CreateUserDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("employee")
  const [department, setDepartment] = useState<Department | "">("")
  const [employeeId, setEmployeeId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setFullName("")
    setEmail("")
    setRole("employee")
    setDepartment("")
    setEmployeeId("")
    setError(null)
  }

  function handleSubmit() {
    setError(null)

    if (fullName.trim() === "") {
      setError("Full name is required.")
      return
    }
    if (email.trim() === "") {
      setError("Email is required.")
      return
    }

    startTransition(async () => {
      const result = await createUserAccount({
        fullName,
        email,
        role,
        department: department || undefined,
        employeeId: employeeId || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" data-icon="inline-start" />
          Create User
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Sends an email invite - the person sets their own password. No credentials are handled here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full-name">
              Full Name<span className="text-destructive">*</span>
            </Label>
            <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              Email<span className="text-destructive">*</span>
            </Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">
                Role<span className="text-destructive">*</span>
              </Label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className={selectClassName}
              >
                {USER_ROLES.map((value) => (
                  <option key={value} value={value}>
                    {USER_ROLE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value as Department | "")}
                className={selectClassName}
              >
                <option value="">None</option>
                {DEPARTMENTS.map((value) => (
                  <option key={value} value={value}>
                    {DEPARTMENT_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-employee">Link to Employee</Label>
            <select
              id="link-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className={selectClassName}
            >
              <option value="">No employee record</option>
              {unlinkedEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                  {employee.email ? ` (${employee.email})` : ""}
                </option>
              ))}
            </select>
            {unlinkedEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground">Every employee already has a linked account.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            {isPending ? "Sending Invite..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
