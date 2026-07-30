"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { ORDER_IMPORT_CONFIG } from "@/components/orders/order-import-config"

// Same lazy-loading strategy as Loose Diamonds/Jewelry (see
// loose-diamond-action-buttons.tsx) - the import wizard pulls in papaparse/
// read-excel-file (and, on demand, pdfjs-dist), none of which belong in
// /orders' initial bundle unless this dialog is actually opened.
const ImportWizard = dynamic<{
  open: boolean
  onOpenChange: (open: boolean) => void
  config: typeof ORDER_IMPORT_CONFIG
}>(() => import("@/components/inventory-import/import-wizard").then((mod) => mod.ImportWizard), {
  ssr: false,
})

export function OrderActionButtons() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <PermissionGate module="orders" action="create">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="size-3.5" data-icon="inline-start" />
          Import Orders
        </Button>
        <Button asChild size="sm">
          <Link href="/orders/new">
            <Plus className="size-3.5" data-icon="inline-start" />
            New Order
          </Link>
        </Button>
        <ImportWizard open={importOpen} onOpenChange={setImportOpen} config={ORDER_IMPORT_CONFIG} />
      </div>
    </PermissionGate>
  )
}
