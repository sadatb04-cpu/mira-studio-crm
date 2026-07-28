"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionCard } from "@/components/shared/section-card"
import { createEmployee, updateEmployee } from "@/app/actions/employees"
import { DEPARTMENTS, DEPARTMENT_LABELS } from "@/types/profile"
import type { Department } from "@/types/profile"
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/types/employee"
import type { EmployeeDetail, EmploymentStatus } from "@/types/employee"

type EmployeeFormProps = { mode: "create"; employee?: undefined } | { mode: "edit"; employee: EmployeeDetail }

export function EmployeeForm(props: EmployeeFormProps) {
  const { mode } = props
  const employee = mode === "edit" ? props.employee : undefined

  const [fullName, setFullName] = useState(employee?.full_name ?? "")
  const [email, setEmail] = useState(employee?.email ?? "")
  const [phone, setPhone] = useState(employee?.phone ?? "")
  const [department, setDepartment] = useState<Department | "none">(employee?.department ?? "none")
  const [position, setPosition] = useState(employee?.position ?? "")
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employment_status ?? "active"
  )
  const [hireDate, setHireDate] = useState(employee?.hire_date ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const input = {
      full_name: fullName,
      email: email || undefined,
      phone: phone || undefined,
      department: department !== "none" ? department : undefined,
      position,
      employment_status: employmentStatus,
      hire_date: hireDate,
    }

    startTransition(async () => {
      const result = mode === "create" ? await createEmployee(input) : await updateEmployee(employee!.id, input)

      // On success the action redirects server-side, so we only ever reach
      // here when it failed.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <SectionCard title="Employee Details" description="HR record only - this does not grant CRM access.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">
              Full Name<span className="text-destructive">*</span>
            </Label>
            <Input id="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={(value) => setDepartment(value as Department | "none")}>
              <SelectTrigger id="department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {DEPARTMENTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DEPARTMENT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={employmentStatus} onValueChange={(value) => setEmploymentStatus(value as EmploymentStatus)}>
              <SelectTrigger id="employment_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EMPLOYMENT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hire_date">
              Hire Date<span className="text-destructive">*</span>
            </Label>
            <Input id="hire_date" type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} />
          </div>
        </div>
      </SectionCard>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : mode === "create" ? "Create Employee" : "Save Changes"}
      </Button>
    </form>
  )
}
