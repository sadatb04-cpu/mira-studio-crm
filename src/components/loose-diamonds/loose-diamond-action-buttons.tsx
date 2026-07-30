"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { LooseDiamondFormDrawer } from "@/components/loose-diamonds/loose-diamond-form-drawer"
import { LOOSE_DIAMOND_IMPORT_CONFIG } from "@/components/loose-diamonds/loose-diamond-import-config"
import type { SupplierOption } from "@/lib/supabase/inventory-shared"

// The import wizard pulls in papaparse/read-excel-file (and, on demand,
// pdfjs-dist) - none of which are needed unless the user actually opens
// this dialog. Loading it lazily keeps those parsing libraries out of
// /inventory/diamonds' initial bundle.
// ImportWizard is generic (TField/TInput), which next/dynamic's inference
// can't preserve - pinning the prop type explicitly to this usage's actual
// config type keeps it type-safe instead of falling back to `object`.
const ImportWizard = dynamic<{
  open: boolean
  onOpenChange: (open: boolean) => void
  config: typeof LOOSE_DIAMOND_IMPORT_CONFIG
}>(() => import("@/components/inventory-import/import-wizard").then((mod) => mod.ImportWizard), {
  ssr: false,
})

interface LooseDiamondActionButtonsProps {
  suppliers: SupplierOption[]
}

export function LooseDiamondActionButtons({ suppliers }: LooseDiamondActionButtonsProps) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <PermissionGate module="inventory" action="create">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="size-3.5" data-icon="inline-start" />
          Import
        </Button>
        <LooseDiamondFormDrawer suppliers={suppliers} />
        <ImportWizard open={importOpen} onOpenChange={setImportOpen} config={LOOSE_DIAMOND_IMPORT_CONFIG} />
      </div>
    </PermissionGate>
  )
}
