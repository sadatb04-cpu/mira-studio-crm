import { format } from "date-fns"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge"
import { formatDuration } from "@/types/attendance"
import type { AttendanceRecord } from "@/types/attendance"
import { Clock } from "lucide-react"

interface AttendanceHistoryTableProps {
  records: AttendanceRecord[]
}

export function AttendanceHistoryTable({ records }: AttendanceHistoryTableProps) {
  if (records.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Clock} title="No attendance records found" description="Try adjusting your filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Check In</th>
            <th className="px-4 py-2">Check Out</th>
            <th className="px-4 py-2">Worked Time</th>
            <th className="px-4 py-2">Break Time</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 font-medium text-foreground">{record.employeeName}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{format(new Date(record.date), "MMM d, yyyy")}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {record.checkIn ? format(new Date(record.checkIn), "h:mm a") : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {record.checkOut ? format(new Date(record.checkOut), "h:mm a") : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDuration(record.totalWorkedSeconds)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDuration(record.totalBreakSeconds)}</td>
              <td className="px-4 py-2.5">
                <AttendanceStatusBadge status={record.status} />
              </td>
              <td className="px-4 py-2.5 max-w-xs truncate text-muted-foreground" title={record.notes ?? undefined}>
                {record.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
