import { z } from "zod"

export const releaseOrderSchema = z.object({
  order_id: z.string().min(1, { error: "Order is required." }),
})

export const assignEmployeeSchema = z.object({
  job_id: z.string().min(1, { error: "Job is required." }),
  employee_id: z.string().min(1, { error: "Select an employee." }),
})

export const updateProductionStatusSchema = z.object({
  job_id: z.string().min(1, { error: "Job is required." }),
  action: z.enum(["advance", "cancel"]),
})

export type ReleaseOrderInput = z.infer<typeof releaseOrderSchema>
export type AssignEmployeeInput = z.infer<typeof assignEmployeeSchema>
export type UpdateProductionStatusInput = z.infer<typeof updateProductionStatusSchema>
