"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  assignTask as assignTaskQuery,
  createTask as createTaskQuery,
  updateTask as updateTaskQuery,
  updateTaskStatus as updateTaskStatusQuery,
} from "@/lib/supabase/tasks"
import { assignTaskSchema, taskFormSchema, updateTaskStatusSchema } from "@/lib/validations/task"
import type { TaskFormInput } from "@/lib/validations/task"
import type { TaskStatus } from "@/types/task"

export interface TaskActionState {
  error?: string
}

export async function createTask(input: TaskFormInput): Promise<TaskActionState> {
  const validated = taskFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let taskId: string
  try {
    taskId = await createTaskQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create task." }
  }

  redirect(`/tasks/${taskId}`)
}

export async function updateTask(id: string, input: TaskFormInput): Promise<TaskActionState> {
  const validated = taskFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateTaskQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update task." }
  }

  redirect(`/tasks/${id}`)
}

export async function assignTask(taskId: string, employeeId: string): Promise<TaskActionState> {
  const validated = assignTaskSchema.safeParse({ task_id: taskId, employee_id: employeeId })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await assignTaskQuery(supabase, validated.data.task_id, validated.data.employee_id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to assign task." }
  }

  return {}
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskActionState> {
  const validated = updateTaskStatusSchema.safeParse({ task_id: taskId, status })

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateTaskStatusQuery(supabase, validated.data.task_id, validated.data.status)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update task status." }
  }

  return {}
}
