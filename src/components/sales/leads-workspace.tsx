"use client"

import { useRef, useState } from "react"

import { QuickAddLeadSheet } from "@/components/sales/quick-add-lead-sheet"
import { LeadsTable } from "@/components/sales/leads-table"
import type { LeadRow } from "@/components/sales/leads-table"
import { createLead, loadMoreLeads, updateLeadStatus } from "@/app/actions/leads"
import type { CreateLeadInput } from "@/lib/validations/lead"
import type { LeadListItem, LeadSource, LeadStatus } from "@/types/lead"

function toOptimisticLead(input: CreateLeadInput, tempId: string): LeadListItem {
  return {
    id: tempId,
    full_name: input.full_name,
    phone: input.phone,
    email: input.email ?? null,
    source: input.source ?? null,
    status: "new",
    created_at: new Date().toISOString(),
  }
}

interface LeadsWorkspaceProps {
  initialLeads: LeadListItem[]
  initialHasMore: boolean
  filters: { search?: string; status?: LeadStatus; source?: LeadSource }
}

// Owns the one piece of client state Quick Add and the leads table both
// need to share - a single component rather than two, so a newly submitted
// lead can appear in the table instantly without any cross-component sync
// mechanism. See quick-add-lead-sheet.tsx for why the Sheet itself stays
// fully synchronous/stateless about save outcome.
export function LeadsWorkspace({ initialLeads, initialHasMore, filters }: LeadsWorkspaceProps) {
  const [rows, setRows] = useState<LeadRow[]>(() => initialLeads.map((lead) => ({ key: lead.id, lead, saveState: "saved" as const })))
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  // Keyset cursor (the created_at of the oldest lead fetched from the
  // server so far), NOT a row count/offset. A count-based offset breaks the
  // moment a Quick Add succeeds - the new lead is newer than the entire
  // paginated window, so it shifts every already-fetched row's position by
  // one, and the next "Load More" would silently re-request rows already
  // shown (duplicate rows in the list). This ref is only ever advanced by a
  // confirmed Load More page below - submitLead() never touches it, so
  // inserting any number of new leads above the cursor (via this user's own
  // Quick Add, or anyone else's, concurrently) can never invalidate it: the
  // cursor is an absolute value tied to real data, not a position.
  const oldestCreatedAtRef = useRef(initialLeads.at(-1)?.created_at ?? null)

  function submitLead(input: CreateLeadInput, retryKey?: string) {
    const key = retryKey ?? crypto.randomUUID()

    setRows((current) => {
      if (retryKey) {
        return current.map((row) => (row.key === retryKey ? { ...row, saveState: "pending", errorMessage: undefined } : row))
      }
      // Prepended, not appended - matches the list's newest-first order,
      // and this is the row about to become the newest lead in the DB.
      return [{ key, lead: toOptimisticLead(input, key), input, saveState: "pending" }, ...current]
    })

    // Deliberately not awaited by the caller (quick-add-lead-sheet.tsx
    // returns immediately after calling this) - each submission resolves
    // independently, keyed by `key`, so out-of-order server responses can
    // never land on the wrong row.
    void (async () => {
      const result = await createLead(input)

      if (result.error || !result.id || !result.created_at) {
        setRows((current) =>
          current.map((row) => (row.key === key ? { ...row, saveState: "error", errorMessage: result.error ?? "Unable to save lead." } : row))
        )
        return
      }

      const { id, created_at } = result
      setRows((current) =>
        current.map((row) => (row.key === key ? { key: id, lead: { ...row.lead, id, created_at }, input, saveState: "saved" } : row))
      )
    })()
  }

  function handleDismiss(key: string) {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  function handleStatusChange(key: string, status: LeadStatus) {
    const previousStatus = rows.find((row) => row.key === key)?.lead.status
    setRows((current) => current.map((row) => (row.key === key ? { ...row, lead: { ...row.lead, status } } : row)))

    void (async () => {
      const result = await updateLeadStatus(key, status)
      if (result.error && previousStatus) {
        setRows((current) => current.map((row) => (row.key === key ? { ...row, lead: { ...row.lead, status: previousStatus } } : row)))
      }
    })()
  }

  function handleLoadMore() {
    if (!oldestCreatedAtRef.current) return

    setIsLoadingMore(true)
    setLoadMoreError(null)

    void (async () => {
      try {
        const page = await loadMoreLeads(filters, oldestCreatedAtRef.current as string)

        if (page.error || !page.leads) {
          setLoadMoreError(page.error ?? "Unable to load more leads.")
          return
        }

        // Existing rows are untouched on both the success and error paths -
        // this only ever appends, and the cursor only advances once a page
        // has actually been confirmed, so a failed attempt leaves the next
        // click retrying the exact same request.
        if (page.leads.length > 0) {
          oldestCreatedAtRef.current = page.leads[page.leads.length - 1].created_at
        }
        setRows((current) => [...current, ...page.leads!.map((lead) => ({ key: lead.id, lead, saveState: "saved" as const }))])
        setHasMore(page.hasMore ?? false)
      } catch {
        // Covers a transport-level rejection (e.g. a network failure
        // calling the server action itself), not just an application error
        // the action already caught and returned as `page.error`.
        setLoadMoreError("Unable to load more leads.")
      } finally {
        setIsLoadingMore(false)
      }
    })()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <QuickAddLeadSheet onSubmit={submitLead} />
      </div>

      <LeadsTable
        rows={rows}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMoreError={loadMoreError}
        onLoadMore={handleLoadMore}
        onStatusChange={handleStatusChange}
        onRetry={(key, input) => submitLead(input, key)}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
