import { PageHeader } from "@/components/shared/page-header"
import { EmployeeForm } from "@/components/employees/employee-form"
import { createClient } from "@/lib/supabase/server"
import { getAvailableProfiles } from "@/lib/supabase/employees"

export default async function NewEmployeePage() {
  const supabase = await createClient()
  const availableProfiles = await getAvailableProfiles(supabase)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="New Employee"
        description="Promote an existing account to an employee and complete their HR details."
      />

      <EmployeeForm mode="create" availableProfiles={availableProfiles} />
    </div>
  )
}
