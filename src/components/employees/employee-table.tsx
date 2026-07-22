"use client"

import { Users } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge"
import { USER_ROLE_LABELS } from "@/types/profile"
import type { EmployeeListItem } from "@/types/employee"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface EmployeeTableProps {
  employees: EmployeeListItem[]
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const router = useRouter()

  if (employees.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Department</th>
            <th className="px-4 py-2">Position</th>
            <th className="px-4 py-2">Employment Status</th>
            <th className="px-4 py-2">Hire Date</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr
              key={employee.id}
              onClick={() => router.push(`/employees/${employee.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  href={`/employees/${employee.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {employee.profile.full_name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{employee.profile.email}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{USER_ROLE_LABELS[employee.profile.role]}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{employee.profile.department ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{employee.position ?? "—"}</td>
              <td className="px-4 py-2.5">
                <EmployeeStatusBadge status={employee.employment_status} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(employee.hire_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
