"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/shared/section-card"
import { createEmployee, updateEmployee } from "@/app/actions/employees"
import { DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, USER_ROLE_LABELS } from "@/types/profile"
import type { Department, UserRole } from "@/types/profile"
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/types/employee"
import type { AvailableProfileOption, EmployeeDetail, EmploymentStatus } from "@/types/employee"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

type EmployeeFormProps =
  | { mode: "create"; employee?: undefined; availableProfiles: AvailableProfileOption[] }
  | { mode: "edit"; employee: EmployeeDetail; availableProfiles?: undefined }

export function EmployeeForm(props: EmployeeFormProps) {
  const { mode } = props
  const employee = mode === "edit" ? props.employee : undefined
  const availableProfiles = mode === "create" ? props.availableProfiles : []

  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [fullName, setFullName] = useState(employee?.profile.full_name ?? "")
  const [email, setEmail] = useState(employee?.profile.email ?? "")
  const [phone, setPhone] = useState(employee?.profile.phone ?? "")
  const [department, setDepartment] = useState<Department | "">(employee?.profile.department ?? "")
  const [role, setRole] = useState<UserRole>(employee?.profile.role ?? "employee")
  const [position, setPosition] = useState(employee?.position ?? "")
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employment_status ?? "active"
  )
  const [hireDate, setHireDate] = useState(employee?.hire_date ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSelectProfile(profileId: string) {
    setSelectedProfileId(profileId)
    const selected = availableProfiles.find((profile) => profile.id === profileId)
    if (selected) {
      setFullName(selected.full_name)
      setEmail(selected.email)
      setPhone(selected.phone ?? "")
      setDepartment(selected.department ?? "")
      setRole(selected.role)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const input = {
      full_name: fullName,
      email,
      phone: phone || undefined,
      department: department || undefined,
      role,
      position,
      employment_status: employmentStatus,
      hire_date: hireDate,
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEmployee({ ...input, profile_id: selectedProfileId })
          : await updateEmployee(employee!.id, input)

      // On success the action redirects server-side, so we only ever reach
      // here when it failed.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const showRestOfForm = mode === "edit" || selectedProfileId !== ""

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {mode === "create" && (
        <SectionCard title="Select Profile" description="Choose an existing account to promote to an employee.">
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="profile">Existing Profile</Label>
            <select
              id="profile"
              value={selectedProfileId}
              onChange={(event) => handleSelectProfile(event.target.value)}
              className={selectClassName}
            >
              <option value="">Select a profile...</option>
              {availableProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} ({profile.email})
                </option>
              ))}
            </select>
            {availableProfiles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Every existing profile already has an employee record.
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {showRestOfForm && (
        <>
          <SectionCard title="Profile Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">
                  Full Name<span className="text-destructive">*</span>
                </Label>
                <Input id="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">
                  Email<span className="text-destructive">*</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
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
            </div>
          </SectionCard>

          <SectionCard title="Employment Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position">
                  Position<span className="text-destructive">*</span>
                </Label>
                <Input id="position" value={position} onChange={(event) => setPosition(event.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employment_status">
                  Employment Status<span className="text-destructive">*</span>
                </Label>
                <select
                  id="employment_status"
                  value={employmentStatus}
                  onChange={(event) => setEmploymentStatus(event.target.value as EmploymentStatus)}
                  className={selectClassName}
                >
                  {EMPLOYMENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {EMPLOYMENT_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hire_date">
                  Hire Date<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={hireDate}
                  onChange={(event) => setHireDate(event.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "Saving..." : mode === "create" ? "Create Employee" : "Save Changes"}
          </Button>
        </>
      )}
    </form>
  )
}
