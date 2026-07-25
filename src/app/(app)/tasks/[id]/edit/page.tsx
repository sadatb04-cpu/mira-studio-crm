import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { TaskForm } from "@/components/tasks/task-form"
import { createClient } from "@/lib/supabase/server"
import { getOrderOptions, getProductionJobOptions, getTask } from "@/lib/supabase/tasks"
import { getEmployees } from "@/lib/supabase/production"
import { requirePagePermission } from "@/lib/require-page-permission"

interface EditTaskPageProps {
  params: Promise<{ id: string }>
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  await requirePagePermission("tasks", "edit")

  const { id } = await params
  const supabase = await createClient()

  const task = await getTask(supabase, id)

  if (!task) {
    notFound()
  }

  const [employees, orders, productionJobs] = await Promise.all([
    getEmployees(supabase),
    getOrderOptions(supabase),
    getProductionJobOptions(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Edit Task" description={`Update "${task.title}".`} />

      <TaskForm mode="edit" task={task} employees={employees} orders={orders} productionJobs={productionJobs} />
    </div>
  )
}
