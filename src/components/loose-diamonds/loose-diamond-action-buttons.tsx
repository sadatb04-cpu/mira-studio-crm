"use client"

import { useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { ImportWizard } from "@/components/inventory-import/import-wizard"
import { LooseDiamondFormDrawer } from "@/components/loose-diamonds/loose-diamond-form-drawer"
import { LOOSE_DIAMOND_IMPORT_CONFIG } from "@/components/loose-diamonds/loose-diamond-import-config"
import type { SupplierOption } from "@/lib/supabase/inventory-shared"

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
