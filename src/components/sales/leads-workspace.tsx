"use client"

import { useState } from "react"

import { QuickAddLeadSheet } from "@/components/sales/quick-add-lead-sheet"
import { LeadImportButton } from "@/components/sales/lead-import-button"
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
  // shown (duplicate rows in the list). Plain state, not a ref, since it
  // now also needs updating during render (see the initialLeads-changed
  // block below, where refs can't be written). Only ever advanced by a
  // confirmed Load More page, or by that same block - submitLead() never
  // touches it, so inserting any number of new leads above the cursor (via
  // this user's own Quick Add, or anyone else's, concurrently) can never
  // invalidate it: the cursor is an absolute value tied to real data, not a
  // position.
  const [oldestCreatedAt, setOldestCreatedAt] = useState(initialLeads.at(-1)?.created_at ?? null)

  // Bulk Import is the one thing on this page that legitimately calls
  // router.refresh() (see ImportWizard's handleFinish) - Quick Add
  // deliberately never does, so without this, a completed import would
  // update the server's data but never reach this already-mounted
  // component (a useState lazy initializer only runs once; a changed
  // initialLeads prop alone doesn't touch state that already exists).
  // "Adjusting state when a prop changes" during render (not in an effect)
  // is React's own documented pattern for this - same technique already
  // used elsewhere in this app (e.g. FolderFormDialog's prevOpen check) -
  // and avoids the extra, unnecessary render an effect-based version would
  // cause. Only runs when initialLeads actually changes identity, which in
  // practice only happens after that router.refresh(). Any row that isn't
  // yet "saved" (a Quick Add still pending or errored) is preserved rather
  // than overwritten, so a bulk import finishing mid Quick-Add-burst can
  // never silently drop an in-flight submission - this is additive to
  // Quick Add, not a change to how it works.
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads)
  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads)
    setRows((current) => {
      const unsettled = current.filter((row) => row.saveState !== "saved")
      const fresh = initialLeads.map((lead) => ({ key: lead.id, lead, saveState: "saved" as const }))
      return [...unsettled, ...fresh]
    })
    setHasMore(initialHasMore)
    setOldestCreatedAt(initialLeads.at(-1)?.created_at ?? null)
  }

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
    if (!oldestCreatedAt) return

    setIsLoadingMore(true)
    setLoadMoreError(null)

    void (async () => {
      try {
        const page = await loadMoreLeads(filters, oldestCreatedAt)

        if (page.error || !page.leads) {
          setLoadMoreError(page.error ?? "Unable to load more leads.")
          return
        }

        // Existing rows are untouched on both the success and error paths -
        // this only ever appends, and the cursor only advances once a page
        // has actually been confirmed, so a failed attempt leaves the next
        // click retrying the exact same request.
        if (page.leads.length > 0) {
          setOldestCreatedAt(page.leads[page.leads.length - 1].created_at)
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
      <div className="flex justify-end gap-2">
        <LeadImportButton />
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
