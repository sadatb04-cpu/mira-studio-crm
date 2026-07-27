import { z } from "zod"

export const brandingTextSchema = z.object({
  applicationName: z.string().trim().min(1, { error: "Application name is required." }).max(60),
  companyName: z.string().trim().min(1, { error: "Company name is required." }).max(120),
})

export type BrandingTextInput = z.infer<typeof brandingTextSchema>
