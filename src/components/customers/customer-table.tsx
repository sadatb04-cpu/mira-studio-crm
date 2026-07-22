"use client"

import { Users } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge"
import type { CustomerListItem } from "@/types/customer"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface CustomerTableProps {
  customers: CustomerListItem[]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const router = useRouter()

  if (customers.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Users} title="No customers found" description="Try adjusting your search or filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Company</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2 text-right">Total Orders</th>
            <th className="px-4 py-2 text-right">Lifetime Spend</th>
            <th className="px-4 py-2">Last Order</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => router.push(`/customers/${customer.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  href={`/customers/${customer.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {customer.full_name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{customer.company_name ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{customer.email ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{customer.phone ?? "—"}</td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">{customer.totalOrders}</td>
              <td className="px-4 py-2.5 text-right font-medium text-foreground">
                {formatCurrency(customer.lifetimeSpend)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(customer.lastOrderDate)}</td>
              <td className="px-4 py-2.5">
                <CustomerStatusBadge isActive={customer.is_active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
