import { execSync } from "node:child_process"
import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import packageJson from "../../../package.json"

function getBuildVersion(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
  } catch {
    return "unknown"
  }
}

interface AboutCardProps {
  lastUpdated: string | null
  lastUpdatedByName: string | null
}

export function AboutCard({ lastUpdated, lastUpdatedByName }: AboutCardProps) {
  const fields = [
    { label: "CRM Version", value: packageJson.version },
    { label: "Build Version", value: getBuildVersion() },
    {
      label: "Settings Last Updated",
      value: lastUpdated
        ? `${format(new Date(lastUpdated), "MMM d, yyyy 'at' h:mm a")}${lastUpdatedByName ? ` by ${lastUpdatedByName}` : ""}`
        : "Never configured",
    },
    { label: "Current Environment", value: process.env.NODE_ENV },
  ]

  return (
    <SectionCard title="About">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
            <dd className="text-sm text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Database version isn&apos;t shown here - the app has no existing mechanism to read it without adding a new
        database function, which is out of scope for this sprint.
      </p>
    </SectionCard>
  )
}
