import { notFound } from "next/navigation"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge"
import { EmployeeSummaryCard } from "@/components/employees/employee-summary-card"
import { EmployeeAssignmentCard } from "@/components/employees/employee-assignment-card"
import { EmployeeTimeline } from "@/components/employees/employee-timeline"
import { createClient } from "@/lib/supabase/server"
import { getEmployee, getEmployeeAssignments, getEmployeeTimeline } from "@/lib/supabase/employees"
import { getUserPermissions } from "@/lib/supabase/permissions"

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const employee = await getEmployee(supabase, id)

  if (!employee) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [assignments, timeline, permissions] = await Promise.all([
    getEmployeeAssignments(supabase, employee.linkedAccount?.userId ?? null),
    getEmployeeTimeline(supabase, id),
    user ? getUserPermissions(supabase, user.id) : null,
  ])

  const canViewTasks = permissions?.modules.tasks.can_view ?? false

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={employee.full_name}
        description={employee.position ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <EmployeeStatusBadge status={employee.employment_status} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/employees/${employee.id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EmployeeSummaryCard employee={employee} />
        <EmployeeAssignmentCard assignments={assignments} canViewTasks={canViewTasks} />
      </div>

      <SectionCard title="Activity">
        <EmployeeTimeline events={timeline} />
      </SectionCard>
    </div>
  )
}
