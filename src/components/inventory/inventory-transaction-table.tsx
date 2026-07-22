import { History } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { INVENTORY_TRANSACTION_TYPE_LABELS } from "@/types/inventory"
import type { InventoryTransactionDetail } from "@/types/inventory"

function formatDateTime(value: string) {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a")
}

interface InventoryTransactionTableProps {
  transactions: InventoryTransactionDetail[]
}

export function InventoryTransactionTable({ transactions }: InventoryTransactionTableProps) {
  if (transactions.length === 0) {
    return <EmptyState icon={History} title="No transactions yet" />
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0" className="border-none shadow-none">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2">Notes</th>
            <th className="px-4 py-2">Related</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(transaction.created_at)}</td>
              <td className="px-4 py-2.5 text-foreground">{INVENTORY_TRANSACTION_TYPE_LABELS[transaction.transaction_type]}</td>
              <td
                className={cn(
                  "px-4 py-2.5 text-right font-medium",
                  transaction.quantity >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {transaction.quantity >= 0 ? "+" : ""}
                {transaction.quantity}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{transaction.notes ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {transaction.relatedProductionJob ? (
                  <Link href={`/production/${transaction.relatedProductionJob.id}`} className="text-primary hover:underline">
                    {transaction.relatedProductionJob.job_number}
                  </Link>
                ) : transaction.relatedOrder ? (
                  <Link href={`/orders/${transaction.relatedOrder.id}`} className="text-primary hover:underline">
                    {transaction.relatedOrder.order_number}
                  </Link>
                ) : transaction.reference_id ? (
                  <span className="font-mono text-xs">{transaction.reference_id}</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
