"use client"

import { ClipboardList, Pencil } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { TASK_PRIORITY_LABELS } from "@/types/task"
import type { TaskListItem } from "@/types/task"

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface TaskTableProps {
  tasks: TaskListItem[]
}

export function TaskTable({ tasks }: TaskTableProps) {
  const router = useRouter()

  if (tasks.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={ClipboardList}
          title="No tasks found"
          description="Try adjusting your search or filters, or create a new task."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Task</th>
            <th className="px-4 py-2">Assigned To</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Related Order</th>
            <th className="px-4 py-2">Due Date</th>
            <th className="px-4 py-2">Created</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => router.push(`/tasks/${task.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  href={`/tasks/${task.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {task.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{task.assigned_employee?.full_name ?? "Unassigned"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{TASK_PRIORITY_LABELS[task.priority]}</td>
              <td className="px-4 py-2.5">
                <TaskStatusBadge status={task.status} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{task.order?.order_number ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(task.due_date)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(task.created_at)}</td>
              <td className="px-4 py-2.5 text-right">
                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Link href={`/tasks/${task.id}/edit`} aria-label="Edit task">
                    <Pencil className="size-3.5" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
