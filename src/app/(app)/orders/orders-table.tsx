"use client"

import { ShoppingBag } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { ORDER_STATUS_LABELS } from "@/types/order"
import type { OrderListItem, OrderStatus } from "@/types/order"

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "info",
  in_production: "warning",
  ready_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
}

interface OrdersTableProps {
  orders: OrderListItem[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()

  if (orders.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description="Try adjusting your search or filters, or check back once new orders come in."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="overflow-x-auto px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2">Order #</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Items</th>
            <th className="px-4 py-2">Stones</th>
            <th className="px-4 py-2">Order Date</th>
            <th className="px-4 py-2">Due Date</th>
            <th className="px-4 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  href={`/orders/${order.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {order.order_number}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-foreground">{order.customer?.full_name ?? "—"}</td>
              <td className="px-4 py-2.5">
                <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{order.order_items[0]?.count ?? 0}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {order.order_stones[0]?.count ?? 0} Stone{(order.order_stones[0]?.count ?? 0) === 1 ? "" : "s"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(order.order_date)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {order.due_date ? formatDate(order.due_date) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right font-medium text-foreground">
                {formatCurrency(order.total, order.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
