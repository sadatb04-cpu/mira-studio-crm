"use client"

import { format } from "date-fns"
import { AlertCircle, Loader2, UserPlus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/types/lead"
import type { LeadListItem, LeadStatus } from "@/types/lead"
import type { CreateLeadInput } from "@/lib/validations/lead"

export interface LeadRow {
  /** The lead's real id once saved, or a client-generated temp id while pending/errored. */
  key: string
  lead: LeadListItem
  /** Only present for client-created rows - lets a failed row be retried with its exact original input. */
  input?: CreateLeadInput
  saveState: "saved" | "pending" | "error"
  errorMessage?: string
}

interface LeadsTableProps {
  rows: LeadRow[]
  hasMore: boolean
  isLoadingMore: boolean
  /** Scoped to the Load More control only - never blocks or hides the rest of the (already-loaded) list. */
  loadMoreError: string | null
  onLoadMore: () => void
  onStatusChange: (key: string, status: LeadStatus) => void
  onRetry: (key: string, input: CreateLeadInput) => void
  onDismiss: (key: string) => void
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
}

export function LeadsTable({ rows, hasMore, isLoadingMore, loadMoreError, onLoadMore, onStatusChange, onRetry, onDismiss }: LeadsTableProps) {
  if (rows.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={UserPlus}
          title="No leads yet"
          description="Use Add Lead to start capturing leads - even before you know what they're interested in."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Phone / WhatsApp</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className={cn(row.saveState === "pending" && "opacity-60", row.saveState === "error" && "bg-destructive/5")}>
              <TableCell className="font-medium text-foreground">{row.lead.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{row.lead.phone}</TableCell>
              <TableCell className="text-muted-foreground">{row.lead.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{row.lead.source ? LEAD_SOURCE_LABELS[row.lead.source] : "—"}</TableCell>
              <TableCell colSpan={row.saveState === "error" ? 2 : 1}>
                {row.saveState === "error" ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <AlertCircle className="size-3.5 shrink-0 text-destructive" />
                    <span className="text-destructive">{row.errorMessage ?? "Failed to save."}</span>
                    <Button type="button" variant="outline" size="xs" onClick={() => row.input && onRetry(row.key, row.input)}>
                      Retry
                    </Button>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDismiss(row.key)} aria-label="Dismiss">
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : row.saveState === "pending" ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <Select value={row.lead.status} onValueChange={(value) => onStatusChange(row.key, value as LeadStatus)}>
                    <SelectTrigger size="sm" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {LEAD_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              {row.saveState !== "error" && <TableCell className="text-muted-foreground">{formatDate(row.lead.created_at)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasMore && (
        <div className="flex flex-col items-center gap-2 border-t border-border p-3">
          <Button type="button" variant="outline" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
            Load More
          </Button>
          {loadMoreError && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {loadMoreError}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}
