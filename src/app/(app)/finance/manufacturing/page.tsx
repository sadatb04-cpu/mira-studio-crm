import { Factory } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ManufacturerCard } from "@/components/finance/manufacturer-card"
import { ManufacturerFormDialog } from "@/components/finance/manufacturer-form-dialog"
import { ManufacturerSearchBar } from "@/components/finance/manufacturer-search-bar"
import { PermissionGate } from "@/components/providers/permission-gate"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { getManufacturers } from "@/lib/supabase/finance-manufacturers"

interface ManufacturingPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function ManufacturingPage({ searchParams }: ManufacturingPageProps) {
  await requirePageView("finance")

  const { q } = await searchParams
  const supabase = await createClient()
  const manufacturers = await getManufacturers(supabase, { search: q })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Manufacturing"
        description="Manufacturers and the invoices they've billed."
        actions={
          <PermissionGate module="finance" action="create">
            <ManufacturerFormDialog mode="create" />
          </PermissionGate>
        }
      />

      <ManufacturerSearchBar />

      {manufacturers.length === 0 ? (
        <EmptyState
          icon={Factory}
          title={q ? "No manufacturers match your search" : "No manufacturers yet"}
          description={q ? undefined : "Add a manufacturer to start recording their invoices."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {manufacturers.map((manufacturer) => (
            <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
          ))}
        </div>
      )}
    </div>
  )
}
