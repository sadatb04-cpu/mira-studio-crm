"use client"

import { useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/providers/permission-gate"
import { InventoryAddDrawer } from "@/components/inventory/inventory-add-drawer"
import { InventoryImportWizard } from "@/components/inventory/inventory-import-wizard"
import type { SupplierOption } from "@/types/inventory"

interface InventoryActionButtonsProps {
  suppliers: SupplierOption[]
}

// The two primary actions - reused in both the page header (always
// visible) and the empty state (a bigger, more discoverable entry point
// for a brand-new inventory) - each instance owns its own open state, so
// having both on screen at once is never a conflict. Gated on "create" so
// both disappear together for a viewer without that permission - the
// server actions behind them re-check independently regardless.
export function InventoryActionButtons({ suppliers }: InventoryActionButtonsProps) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <PermissionGate module="inventory" action="create">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="size-3.5" data-icon="inline-start" />
          Import Inventory
        </Button>
        <InventoryAddDrawer suppliers={suppliers} />
        <InventoryImportWizard open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </PermissionGate>
  )
}
