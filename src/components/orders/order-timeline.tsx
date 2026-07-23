import { History } from "lucide-react"
import { format } from "date-fns"

import { EmptyState } from "@/components/shared/empty-state"
import type { OrderTimelineEvent } from "@/types/order"

const ACTION_LABELS: Record<string, string> = {
  created: "Order Created",
  updated: "Order Updated",
  stone_added: "Stone Added",
  stone_removed: "Stone Removed",
  file_uploaded: "File Uploaded",
  file_removed: "File Removed",
}

interface OrderTimelineProps {
  events: OrderTimelineEvent[]
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  if (events.length === 0) {
    return <EmptyState icon={History} title="No activity yet" />
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {ACTION_LABELS[event.action] ?? event.action}
            </span>
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
