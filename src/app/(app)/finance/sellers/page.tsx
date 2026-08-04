import { Store } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { SellerCard } from "@/components/finance/seller-card"
import { SellerFormDialog } from "@/components/finance/seller-form-dialog"
import { SellerSearchBar } from "@/components/finance/seller-search-bar"
import { PermissionGate } from "@/components/providers/permission-gate"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { getSellers } from "@/lib/supabase/finance-sellers"

interface SellersPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SellersPage({ searchParams }: SellersPageProps) {
  await requirePageView("finance")

  const { q } = await searchParams
  const supabase = await createClient()
  const sellers = await getSellers(supabase, { search: q })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Sellers"
        description="Sellers, their sales, and automatically calculated profit."
        actions={
          <PermissionGate module="finance" action="create">
            <SellerFormDialog mode="create" />
          </PermissionGate>
        }
      />

      <SellerSearchBar />

      {sellers.length === 0 ? (
        <EmptyState
          icon={Store}
          title={q ? "No sellers match your search" : "No sellers yet"}
          description={q ? undefined : "Add a seller to start recording their sales."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  )
}
