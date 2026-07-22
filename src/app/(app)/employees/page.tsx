import { Plus, Users } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getEmployeeDashboardStats, getEmployees } from "@/lib/supabase/employees"
import { EmployeeFilters } from "@/components/employees/employee-filters"
import { EmployeeTable } from "@/components/employees/employee-table"
import { DEPARTMENTS, USER_ROLES } from "@/types/profile"
import type { Department, UserRole } from "@/types/profile"
import { EMPLOYMENT_STATUSES } from "@/types/employee"
import type { EmploymentStatus } from "@/types/employee"

interface EmployeesPageProps {
  searchParams: Promise<{
    q?: string
    employmentStatus?: string
    department?: string
    role?: string
  }>
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const { q, employmentStatus, department, role } = await searchParams
  const supabase = await createClient()

  const validStatus = EMPLOYMENT_STATUSES.includes(employmentStatus as EmploymentStatus)
    ? (employmentStatus as EmploymentStatus)
    : undefined
  const validDepartment = DEPARTMENTS.includes(department as Department) ? (department as Department) : undefined
  const validRole = USER_ROLES.includes(role as UserRole) ? (role as UserRole) : undefined

  const [employees, stats] = await Promise.all([
    getEmployees(supabase, {
      search: q,
      employmentStatus: validStatus,
      department: validDepartment,
      role: validRole,
    }),
    getEmployeeDashboardStats(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Employees"
        description="Manage workforce records, schedules, and permissions."
        actions={
          <Button asChild size="sm">
            <Link href="/employees/new">
              <Plus className="size-3.5" data-icon="inline-start" />
              New Employee
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Employees" value={stats.total} icon={Users} />
        <StatCard label="Active Employees" value={stats.active} />
        <StatCard label="On Leave" value={stats.onLeave} />
        <StatCard label="Terminated" value={stats.terminated} />
        <StatCard label="New Hires (30 days)" value={stats.newHires30Days} />
      </div>

      <EmployeeFilters />

      <EmployeeTable employees={employees} />
    </div>
  )
}
