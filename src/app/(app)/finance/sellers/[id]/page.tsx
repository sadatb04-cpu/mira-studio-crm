import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronRight, Receipt, TrendingUp } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { SellerActions } from "@/components/finance/seller-actions"
import { SellerInvoiceFormDialog } from "@/components/finance/seller-invoice-form-dialog"
import { SellerInvoiceFilters } from "@/components/finance/seller-invoice-filters"
import { SellerInvoiceTable } from "@/components/finance/seller-invoice-table"
import { PermissionGate } from "@/components/providers/permission-gate"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { FINANCE_INVOICES_PAGE_SIZE, getSeller, getSellerInvoices } from "@/lib/supabase/finance-sellers"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface SellerDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; dateAfter?: string }>
}

export default async function SellerDetailPage({ params, searchParams }: SellerDetailPageProps) {
  await requirePageView("finance")

  const { id } = await params
  const { q, dateAfter } = await searchParams
  const supabase = await createClient()

  const seller = await getSeller(supabase, id)
  if (!seller) notFound()

  const { invoices, hasMore } = await getSellerInvoices(supabase, {
    sellerId: id,
    search: q,
    invoiceDateAfter: dateAfter,
    limit: FINANCE_INVOICES_PAGE_SIZE,
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <Link href="/finance/sellers" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" />
          Back to Sellers
        </Link>

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/finance" className="hover:text-foreground hover:underline">
            Finance
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/finance/sellers" className="hover:text-foreground hover:underline">
            Sellers
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{seller.name}</span>
        </nav>
      </div>

      <PageHeader
        title={seller.name}
        description="Sales recorded for this seller. Profit is calculated automatically."
        actions={
          <div className="flex items-center gap-2">
            <SellerActions sellerId={seller.id} sellerName={seller.name} />
            <PermissionGate module="finance" action="create">
              <SellerInvoiceFormDialog sellerId={seller.id} mode="create" />
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Invoices" value={seller.invoiceCount} icon={Receipt} />
        <StatCard label="Total Profit" value={formatCurrency(seller.totalProfit)} icon={TrendingUp} />
      </div>

      <SellerInvoiceFilters />
      <SellerInvoiceTable key={`${q ?? ""}-${dateAfter ?? ""}`} sellerId={seller.id} invoices={invoices} hasMore={hasMore} />
    </div>
  )
}
