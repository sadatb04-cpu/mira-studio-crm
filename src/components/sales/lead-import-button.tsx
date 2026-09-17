"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { LEAD_IMPORT_CONFIG } from "@/components/sales/lead-import-config"

// Same lazy-loading strategy as Orders/Loose Diamonds/Jewelry (see
// order-action-buttons.tsx) - the import wizard pulls in papaparse/
// read-excel-file (and, on demand, pdfjs-dist), none of which belong in
// /sales' initial bundle unless this dialog is actually opened.
const ImportWizard = dynamic<{
  open: boolean
  onOpenChange: (open: boolean) => void
  config: typeof LEAD_IMPORT_CONFIG
}>(() => import("@/components/inventory-import/import-wizard").then((mod) => mod.ImportWizard), {
  ssr: false,
})

export function LeadImportButton() {
  const [open, setOpen] = useState(false)

  return (
    <PermissionGate module="sales" action="create">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="size-3.5" data-icon="inline-start" />
        Import Leads
      </Button>
      <ImportWizard open={open} onOpenChange={setOpen} config={LEAD_IMPORT_CONFIG} />
    </PermissionGate>
  )
}
