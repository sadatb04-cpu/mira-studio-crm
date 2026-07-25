import { PageHeader } from "@/components/shared/page-header"
import { EmployeeForm } from "@/components/employees/employee-form"

export default function NewEmployeePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="New Employee"
        description="Add an HR record. This does not grant CRM access - link an account from Settings → Users afterward if needed."
      />

      <EmployeeForm mode="create" />
    </div>
  )
}
