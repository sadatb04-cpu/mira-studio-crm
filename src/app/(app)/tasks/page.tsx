import { ClipboardList, Plus } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getTaskDashboardStats, getTasks } from "@/lib/supabase/tasks"
import { getEmployees } from "@/lib/supabase/production"
import { requirePageView } from "@/lib/require-page-permission"
import { TaskFilters } from "@/components/tasks/task-filters"
import { TaskTable } from "@/components/tasks/task-table"
import { PermissionGate } from "@/components/providers/permission-gate"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task"
import type { TaskPriority, TaskStatus } from "@/types/task"

interface TasksPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    priority?: string
    assignedTo?: string
    due?: string
  }>
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  await requirePageView("tasks")

  const { q, status, priority, assignedTo, due } = await searchParams
  const supabase = await createClient()

  const validStatus = TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : undefined
  const validPriority = TASK_PRIORITIES.includes(priority as TaskPriority) ? (priority as TaskPriority) : undefined
  const validDue = due === "due_today" || due === "overdue" ? due : undefined

  const [tasks, stats, employees] = await Promise.all([
    getTasks(supabase, { search: q, status: validStatus, priority: validPriority, assignedTo, dueFilter: validDue }),
    getTaskDashboardStats(supabase),
    getEmployees(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Tasks"
        description="View and coordinate team tasks, assignments, and scheduling."
        actions={
          <PermissionGate module="tasks" action="create">
            <Button asChild size="sm">
              <Link href="/tasks/new">
                <Plus className="size-3.5" data-icon="inline-start" />
                New Task
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Tasks" value={stats.total} icon={ClipboardList} />
        <StatCard label="Todo" value={stats.todo} />
        <StatCard label="In Progress" value={stats.inProgress} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Overdue" value={stats.overdue} />
      </div>

      <TaskFilters employees={employees} />

      <TaskTable tasks={tasks} />
    </div>
  )
}
