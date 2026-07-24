import { z } from "zod"

export const documentFolderSchema = z.object({
  name: z.string().trim().min(1, { error: "Folder name is required." }),
  description: z.string().trim().optional(),
})

export type DocumentFolderInput = z.infer<typeof documentFolderSchema>
