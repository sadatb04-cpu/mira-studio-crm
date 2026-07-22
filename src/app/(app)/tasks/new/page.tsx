import { PageHeader } from "@/components/shared/page-header"
import { TaskForm } from "@/components/tasks/task-form"
import { createClient } from "@/lib/supabase/server"
import { getOrderOptions, getProductionJobOptions } from "@/lib/supabase/tasks"
import { getEmployees } from "@/lib/supabase/production"

export default async function NewTaskPage() {
  const supabase = await createClient()

  const [employees, orders, productionJobs] = await Promise.all([
    getEmployees(supabase),
    getOrderOptions(supabase),
    getProductionJobOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="New Task" description="Create a task and optionally assign it or link it to related records." />

      <TaskForm mode="create" employees={employees} orders={orders} productionJobs={productionJobs} />
    </div>
  )
}
