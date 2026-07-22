import { Plus, Users } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getCustomers, getCustomersDashboardStats } from "@/lib/supabase/customers"
import { CustomerFilters } from "@/components/customers/customer-filters"
import { CustomerTable } from "@/components/customers/customer-table"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface CustomersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q, status } = await searchParams
  const supabase = await createClient()

  const validStatus = status === "active" || status === "inactive" ? status : undefined

  const [customers, stats] = await Promise.all([
    getCustomers(supabase, { search: q, status: validStatus }),
    getCustomersDashboardStats(supabase),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Customers"
        description="Manage customer profiles, purchase history, and relationships."
        actions={
          <Button asChild size="sm">
            <Link href="/customers/new">
              <Plus className="size-3.5" data-icon="inline-start" />
              New Customer
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Customers" value={stats.totalCustomers} icon={Users} />
        <StatCard label="Active Customers" value={stats.activeCustomers} />
        <StatCard label="New Customers (30 days)" value={stats.newCustomers30Days} />
        <StatCard label="Lifetime Revenue" value={formatCurrency(stats.lifetimeRevenue)} />
      </div>

      <CustomerFilters />

      <CustomerTable customers={customers} />
    </div>
  )
}
