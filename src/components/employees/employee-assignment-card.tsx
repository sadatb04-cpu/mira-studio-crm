import Link from "next/link"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductionStatusBadge } from "@/components/production/production-status-badge"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import type { EmployeeAssignments } from "@/types/employee"

interface EmployeeAssignmentCardProps {
  assignments: EmployeeAssignments
  canViewTasks: boolean
}

export function EmployeeAssignmentCard({ assignments, canViewTasks }: EmployeeAssignmentCardProps) {
  const { productionJobs, tasks } = assignments

  const activeJobs = productionJobs.filter((job) => job.status !== "completed" && job.status !== "cancelled").length
  const completedJobs = productionJobs.filter((job) => job.status === "completed").length

  const todoTasks = tasks.filter((task) => task.status === "todo").length
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
  const completedTasks = tasks.filter((task) => task.status === "done").length

  return (
    <SectionCard title="Current Workload">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Production</span>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Assigned: {productionJobs.length}</span>
              <span>Active: {activeJobs}</span>
              <span>Completed: {completedJobs}</span>
            </div>
          </div>

          {productionJobs.length === 0 ? (
            <EmptyState title="No production jobs assigned" className="py-8" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {productionJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between text-sm">
                  <Link href={`/production/${job.id}`} className="text-primary hover:underline">
                    {job.job_number}
                  </Link>
                  <ProductionStatusBadge status={job.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {canViewTasks && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Tasks</span>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Todo: {todoTasks}</span>
                <span>In Progress: {inProgressTasks}</span>
                <span>Completed: {completedTasks}</span>
              </div>
            </div>

            {tasks.length === 0 ? (
              <EmptyState title="No tasks assigned" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-1.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between text-sm">
                    <Link href={`/tasks/${task.id}`} className="text-primary hover:underline">
                      {task.title}
                    </Link>
                    <TaskStatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
