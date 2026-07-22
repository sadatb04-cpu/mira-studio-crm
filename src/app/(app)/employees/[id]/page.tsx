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

  const [assignments, timeline] = await Promise.all([
    getEmployeeAssignments(supabase, id),
    getEmployeeTimeline(supabase, id),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={employee.profile.full_name}
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
        <EmployeeAssignmentCard assignments={assignments} />
      </div>

      <SectionCard title="Activity">
        <EmployeeTimeline events={timeline} />
      </SectionCard>
    </div>
  )
}
