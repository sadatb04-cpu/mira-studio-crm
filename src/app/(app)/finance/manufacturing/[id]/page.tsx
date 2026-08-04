import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronRight, DollarSign, Receipt } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { ManufacturerActions } from "@/components/finance/manufacturer-actions"
import { ManufacturerInvoiceFormDialog } from "@/components/finance/manufacturer-invoice-form-dialog"
import { ManufacturerInvoiceFilters } from "@/components/finance/manufacturer-invoice-filters"
import { ManufacturerInvoiceTable } from "@/components/finance/manufacturer-invoice-table"
import { PermissionGate } from "@/components/providers/permission-gate"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { FINANCE_INVOICES_PAGE_SIZE, getManufacturer, getManufacturerInvoices } from "@/lib/supabase/finance-manufacturers"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface ManufacturerDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; dateAfter?: string }>
}

export default async function ManufacturerDetailPage({ params, searchParams }: ManufacturerDetailPageProps) {
  await requirePageView("finance")

  const { id } = await params
  const { q, dateAfter } = await searchParams
  const supabase = await createClient()

  const manufacturer = await getManufacturer(supabase, id)
  if (!manufacturer) notFound()

  const { invoices, hasMore } = await getManufacturerInvoices(supabase, {
    manufacturerId: id,
    search: q,
    invoiceDateAfter: dateAfter,
    limit: FINANCE_INVOICES_PAGE_SIZE,
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <Link href="/finance/manufacturing" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" />
          Back to Manufacturing
        </Link>

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/finance" className="hover:text-foreground hover:underline">
            Finance
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/finance/manufacturing" className="hover:text-foreground hover:underline">
            Manufacturing
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{manufacturer.name}</span>
        </nav>
      </div>

      <PageHeader
        title={manufacturer.name}
        description="Invoices billed by this manufacturer."
        actions={
          <div className="flex items-center gap-2">
            <ManufacturerActions manufacturerId={manufacturer.id} manufacturerName={manufacturer.name} />
            <PermissionGate module="finance" action="create">
              <ManufacturerInvoiceFormDialog manufacturerId={manufacturer.id} mode="create" />
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Invoices" value={manufacturer.invoiceCount} icon={Receipt} />
        <StatCard label="Total Manufacturing Spend" value={formatCurrency(manufacturer.totalManufacturingSpend)} icon={DollarSign} />
      </div>

      <ManufacturerInvoiceFilters />
      <ManufacturerInvoiceTable key={`${q ?? ""}-${dateAfter ?? ""}`} manufacturerId={manufacturer.id} invoices={invoices} hasMore={hasMore} />
    </div>
  )
}
