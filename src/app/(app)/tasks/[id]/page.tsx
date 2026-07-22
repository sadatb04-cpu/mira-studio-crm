import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { TaskSummaryCard } from "@/components/tasks/task-summary-card"
import { TaskAssignmentCard } from "@/components/tasks/task-assignment-card"
import { TaskTimeline } from "@/components/tasks/task-timeline"
import { createClient } from "@/lib/supabase/server"
import { getTask, getTaskTimeline } from "@/lib/supabase/tasks"
import { getEmployees } from "@/lib/supabase/production"

interface TaskDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const task = await getTask(supabase, id)

  if (!task) {
    notFound()
  }

  const [employees, timeline] = await Promise.all([getEmployees(supabase), getTaskTimeline(supabase, id)])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title={task.title} description="Task" actions={<TaskStatusBadge status={task.status} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TaskSummaryCard task={task} />
        <TaskAssignmentCard
          taskId={task.id}
          employees={employees}
          assignedEmployeeId={task.assigned_employee?.id ?? null}
        />
      </div>

      <SectionCard title="Timeline">
        <TaskTimeline events={timeline} />
      </SectionCard>
    </div>
  )
}
