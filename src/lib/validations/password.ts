import { z } from "zod"

// Shared by account creation, admin-initiated resets, and self-service
// password changes - one rule set enforced everywhere a password is set.
export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." })
  .regex(/[A-Za-z]/, { error: "Password must include at least one letter." })
  .regex(/[0-9]/, { error: "Password must include at least one number." })
