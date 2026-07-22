import { z } from "zod"

import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task"

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required." }),
  description: z.string().trim().optional(),
  priority: z.enum(TASK_PRIORITIES, { error: "Select a priority." }),
  status: z.enum(TASK_STATUSES, { error: "Select a status." }),
  due_date: z.string().trim().min(1, { error: "Due date is required." }),
  assigned_to: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
  production_job_id: z.string().trim().optional(),
})

export type TaskFormInput = z.infer<typeof taskFormSchema>

export const updateTaskStatusSchema = z.object({
  task_id: z.string().min(1),
  status: z.enum(TASK_STATUSES, { error: "Select a status." }),
})

export const assignTaskSchema = z.object({
  task_id: z.string().min(1),
  employee_id: z.string().min(1, { error: "Select an employee." }),
})
