import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { EmployeeForm } from "@/components/employees/employee-form"
import { createClient } from "@/lib/supabase/server"
import { getEmployee } from "@/lib/supabase/employees"

interface EditEmployeePageProps {
  params: Promise<{ id: string }>
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const employee = await getEmployee(supabase, id)

  if (!employee) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Edit Employee" description={`Update ${employee.profile.full_name}'s record.`} />

      <EmployeeForm mode="edit" employee={employee} />
    </div>
  )
}
