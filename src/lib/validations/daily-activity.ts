import { z } from "zod"

export const createActivitySchema = z.object({
  activityTitle: z.string().trim().min(1, { error: "Activity title is required." }).max(200),
  description: z.string().trim().max(2000).optional(),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

export const updateActivitySchema = z.object({
  activityTitle: z.string().trim().min(1, { error: "Activity title is required." }).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>
