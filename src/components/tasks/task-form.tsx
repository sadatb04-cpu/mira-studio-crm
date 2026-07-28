"use client"

import { useState, useTransition } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionCard } from "@/components/shared/section-card"
import { createTask, updateTask } from "@/app/actions/tasks"
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/types/task"
import type { OrderOption, ProductionJobOption, TaskDetail, TaskPriority, TaskStatus } from "@/types/task"
import type { EmployeeOption } from "@/types/production"

const STEPS = ["Task Information", "Assignment", "Related Records", "Review"] as const

type TaskFormProps = {
  employees: EmployeeOption[]
  orders: OrderOption[]
  productionJobs: ProductionJobOption[]
  /** Settings > Business Rules "Default Task Priority" - only meaningful in create mode. */
  defaultPriority?: TaskPriority
} & ({ mode: "create"; task?: undefined } | { mode: "edit"; task: TaskDetail })

export function TaskForm({ mode, task, employees, orders, productionJobs, defaultPriority }: TaskFormProps) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? defaultPriority ?? "medium")
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo")
  const [dueDate, setDueDate] = useState(task?.due_date ?? "")
  const [assignedTo, setAssignedTo] = useState(task?.assigned_employee?.id ?? "unassigned")
  const [orderId, setOrderId] = useState(task?.order?.id ?? "none")
  const [productionJobId, setProductionJobId] = useState(task?.production_job?.id ?? "none")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canProceed = step === 0 ? title.trim() !== "" && dueDate !== "" : true

  const selectedEmployee = employees.find((employee) => employee.id === assignedTo) ?? null
  const selectedOrder = orders.find((order) => order.id === orderId) ?? null
  const selectedProductionJob = productionJobs.find((job) => job.id === productionJobId) ?? null

  function handleSubmit() {
    setError(null)

    const input = {
      title,
      description: description || undefined,
      priority,
      status,
      due_date: dueDate,
      assigned_to: assignedTo !== "unassigned" ? assignedTo : undefined,
      order_id: orderId !== "none" ? orderId : undefined,
      production_job_id: productionJobId !== "none" ? productionJobId : undefined,
    }

    startTransition(async () => {
      const result = mode === "create" ? await createTask(input) : await updateTask(task.id, input)

      // On success the action redirects server-side, so we only ever reach
      // here when it failed.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                index === step
                  ? "border-primary bg-primary/10 text-primary"
                  : index < step
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-border text-muted-foreground/60"
              )}
            >
              <span>{index + 1}</span>
              <span>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="h-px w-4 bg-border" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <SectionCard title="Task Information" description="What needs to be done, and by when.">
          <div className="flex flex-col gap-4 sm:max-w-lg">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">
                Title<span className="text-destructive">*</span>
              </Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                placeholder="Optional details about this task..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">
                  Priority<span className="text-destructive">*</span>
                </Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TASK_PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">
                  Status<span className="text-destructive">*</span>
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TASK_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="due-date">
                Due Date<span className="text-destructive">*</span>
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="Assignment" description="Who is responsible for this task (optional).">
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="assigned-to">Assigned Employee</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="assigned-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="Related Records" description="Link this task to an order or production job (optional).">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-lg">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order">Related Order</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger id="order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="production-job">Related Production Job</Label>
              <Select value={productionJobId} onValueChange={setProductionJobId}>
                <SelectTrigger id="production-job">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {productionJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="Review">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Title</dt>
              <dd className="text-sm text-foreground">{title || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Description</dt>
              <dd className="text-sm text-foreground">{description || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Priority</dt>
              <dd className="text-sm text-foreground">{TASK_PRIORITY_LABELS[priority]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Status</dt>
              <dd className="text-sm text-foreground">{TASK_STATUS_LABELS[status]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Due Date</dt>
              <dd className="text-sm text-foreground">{dueDate || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Assigned Employee</dt>
              <dd className="text-sm text-foreground">{selectedEmployee?.full_name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Related Order</dt>
              <dd className="text-sm text-foreground">{selectedOrder?.order_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Related Production Job</dt>
              <dd className="text-sm text-foreground">{selectedProductionJob?.job_number ?? "—"}</dd>
            </div>
          </dl>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </SectionCard>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || isPending}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((current) => current + 1)} disabled={!canProceed}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  )
}
