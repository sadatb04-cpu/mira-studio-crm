"use client"

import { useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { ImportWizard } from "@/components/inventory-import/import-wizard"
import { JewelryFormDrawer } from "@/components/jewelry/jewelry-form-drawer"
import { JEWELRY_IMPORT_CONFIG } from "@/components/jewelry/jewelry-import-config"
import type { SupplierOption } from "@/lib/supabase/inventory-shared"

interface JewelryActionButtonsProps {
  suppliers: SupplierOption[]
}

export function JewelryActionButtons({ suppliers }: JewelryActionButtonsProps) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <PermissionGate module="inventory" action="create">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="size-3.5" data-icon="inline-start" />
          Import
        </Button>
        <JewelryFormDrawer suppliers={suppliers} />
        <ImportWizard open={importOpen} onOpenChange={setImportOpen} config={JEWELRY_IMPORT_CONFIG} />
      </div>
    </PermissionGate>
  )
}
