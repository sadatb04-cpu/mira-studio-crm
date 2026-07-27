"use client"

import { Users } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Customer</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Total Orders</TableHead>
            <TableHead className="text-right">Lifetime Spend</TableHead>
            <TableHead>Last Order</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              onClick={() => router.push(`/customers/${customer.id}`)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium text-foreground">
                <Link
                  href={`/customers/${customer.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {customer.full_name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.company_name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{customer.totalOrders}</TableCell>
              <TableCell className="text-right font-medium text-foreground">
                {formatCurrency(customer.lifetimeSpend)}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(customer.lastOrderDate)}</TableCell>
              <TableCell>
                <CustomerStatusBadge isActive={customer.is_active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
