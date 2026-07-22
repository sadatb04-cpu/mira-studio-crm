import { ClipboardList, Gem, History, ShoppingBag, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { format } from "date-fns"

import { EmptyState } from "@/components/shared/empty-state"
import type { ActivityItem } from "@/types/report"

const ENTITY_ICONS: Record<string, LucideIcon> = {
  order: ShoppingBag,
  production_job: Gem,
  customer: Users,
  employee: ClipboardList,
  task: ClipboardList,
}

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  assigned: "assigned",
  status_changed: "status changed",
  completed: "completed",
  ready: "marked ready",
}

interface RecentActivityProps {
  items: ActivityItem[]
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return <EmptyState icon={History} title="No recent activity" />
  }

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) => {
        const Icon = ENTITY_ICONS[item.entityType] ?? History

        return (
          <li key={item.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-foreground">
                {item.actorName && <span className="font-medium">{item.actorName} </span>}
                {ACTION_LABELS[item.action] ?? item.action}
                {item.entityLabel && <span className="font-medium"> {item.entityLabel}</span>}
              </p>
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
