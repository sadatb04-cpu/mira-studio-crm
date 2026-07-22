import Link from "next/link"
import { format } from "date-fns"
import { ClipboardList } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { TASK_PRIORITY_LABELS } from "@/types/task"
import type { TaskListItem } from "@/types/task"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface TodaysTasksCardProps {
  tasks: TaskListItem[]
}

export function TodaysTasksCard({ tasks }: TodaysTasksCardProps) {
  return (
    <SectionCard title="Today's Tasks" description="Tasks due today." contentClassName="px-0">
      {tasks.length === 0 ? (
        <div className="px-4">
          <EmptyState icon={ClipboardList} title="Nothing due today" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Assigned To</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link href={`/tasks/${task.id}`} className="block hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{TASK_PRIORITY_LABELS[task.priority]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(task.due_date)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {task.assigned_employee?.full_name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-2.5">
                    <TaskStatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
