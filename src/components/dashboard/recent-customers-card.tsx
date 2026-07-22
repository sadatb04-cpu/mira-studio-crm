import Link from "next/link"
import { Users } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import type { CustomerListItem } from "@/types/customer"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface RecentCustomersCardProps {
  customers: CustomerListItem[]
}

export function RecentCustomersCard({ customers }: RecentCustomersCardProps) {
  return (
    <SectionCard title="Recent Customers" description="Newest customer profiles." contentClassName="px-0">
      {customers.length === 0 ? (
        <div className="px-4">
          <EmptyState icon={Users} title="No customers yet" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right">Total Orders</th>
                <th className="px-4 py-2 text-right">Lifetime Spend</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link href={`/customers/${customer.id}`} className="block hover:underline">
                      {customer.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{customer.totalOrders}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-foreground">
                    {formatCurrency(customer.lifetimeSpend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
