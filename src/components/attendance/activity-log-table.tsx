"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useCanAccess } from "@/components/providers/permissions-provider"
import { managerDeleteActivity, managerReopenActivity } from "@/app/actions/daily-activities"
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_TONE, formatActivityDuration } from "@/types/daily-activity"
import type { DailyActivity } from "@/types/daily-activity"

function formatDateTime(value: string | null): string {
  return value ? format(new Date(value), "MMM d, h:mm a") : "—"
}

interface ActivityLogTableProps {
  activities: DailyActivity[]
}

export function ActivityLogTable({ activities }: ActivityLogTableProps) {
  const router = useRouter()
  const canEdit = useCanAccess("attendance", "edit")
  const canDelete = useCanAccess("attendance", "delete")
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleReopen(activityId: string) {
    setPendingId(activityId)
    void (async () => {
      await managerReopenActivity(activityId)
      setPendingId(null)
      router.refresh()
    })()
  }

  function handleDelete(activityId: string) {
    setPendingId(activityId)
    void (async () => {
      await managerDeleteActivity(activityId)
      setPendingId(null)
      router.refresh()
    })()
  }

  if (activities.length === 0) {
    return (
      <SectionCard>
        <EmptyState title="No activities found" description="Try adjusting your search or filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Employee</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            {(canEdit || canDelete) && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="font-medium text-foreground">{activity.employeeName}</TableCell>
              <TableCell className="text-foreground">{activity.activityTitle}</TableCell>
              <TableCell>
                <StatusBadge label={ACTIVITY_STATUS_LABELS[activity.status]} tone={ACTIVITY_STATUS_TONE[activity.status]} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(activity.startedAt)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(activity.completedAt)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatActivityDuration(activity.durationMinutes)}</TableCell>
              {(canEdit || canDelete) && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={pendingId === activity.id}>
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && activity.status !== "pending" && (
                        <DropdownMenuItem onSelect={() => handleReopen(activity.id)}>
                          <RotateCcw />
                          Reopen
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(activity.id)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
