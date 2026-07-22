import { PageHeader } from "@/components/shared/page-header"
import { TaskForm } from "@/components/tasks/task-form"
import { createClient } from "@/lib/supabase/server"
import { getOrderOptions, getProductionJobOptions } from "@/lib/supabase/tasks"
import { getEmployees } from "@/lib/supabase/production"
import { getSettingsBundle } from "@/lib/supabase/settings"

export default async function NewTaskPage() {
  const supabase = await createClient()

  const [employees, orders, productionJobs, settings] = await Promise.all([
    getEmployees(supabase),
    getOrderOptions(supabase),
    getProductionJobOptions(supabase),
    getSettingsBundle(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="New Task" description="Create a task and optionally assign it or link it to related records." />

      <TaskForm
        mode="create"
        employees={employees}
        orders={orders}
        productionJobs={productionJobs}
        defaultPriority={settings.businessRules.defaultTaskPriority}
      />
    </div>
  )
}
