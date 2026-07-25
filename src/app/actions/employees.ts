"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  createEmployee as createEmployeeQuery,
  updateEmployee as updateEmployeeQuery,
} from "@/lib/supabase/employees"
import { employeeFormSchema } from "@/lib/validations/employee"
import type { EmployeeFormInput } from "@/lib/validations/employee"

export interface EmployeeActionState {
  error?: string
}

export async function createEmployee(input: EmployeeFormInput): Promise<EmployeeActionState> {
  const validated = employeeFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  let employeeId: string
  try {
    employeeId = await createEmployeeQuery(supabase, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create employee." }
  }

  redirect(`/employees/${employeeId}`)
}

export async function updateEmployee(id: string, input: EmployeeFormInput): Promise<EmployeeActionState> {
  const validated = employeeFormSchema.safeParse(input)

  if (!validated.success) {
    return { error: validated.error.issues.map((issue) => issue.message).join(" ") }
  }

  const supabase = await createClient()

  try {
    await updateEmployeeQuery(supabase, id, validated.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update employee." }
  }

  redirect(`/employees/${id}`)
}
