"use client"

import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadMoreOrders } from "@/app/actions/orders"
import { ORDER_STATUS_LABELS } from "@/types/order"
import type { OrderListItem, OrderStatus } from "@/types/order"

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  pricing_ready: "info",
  awaiting_approval: "warning",
  approved: "success",
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
  /** Whether the initial fetch was truncated - omitted (or false) when a search is active, since search results already come back in full. */
  hasMore?: boolean
  status?: OrderStatus
}

export function OrdersTable({ orders: initialOrders, hasMore: initialHasMore = false, status }: OrdersTableProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  function handleLoadMore() {
    setIsLoading(true)
    void (async () => {
      const page = await loadMoreOrders({ status }, orders.length)
      setOrders((current) => [...current, ...page.orders])
      setHasMore(page.hasMore)
      setIsLoading(false)
    })()
  }

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
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Stones</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer">
              <TableCell className="font-medium text-foreground">
                <Link
                  href={`/orders/${order.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {order.order_number}
                </Link>
              </TableCell>
              <TableCell className="text-foreground">{order.customer?.full_name ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />
              </TableCell>
              <TableCell className="text-muted-foreground">{order.order_items[0]?.count ?? 0}</TableCell>
              <TableCell className="text-muted-foreground">
                {order.order_stones[0]?.count ?? 0} Stone{(order.order_stones[0]?.count ?? 0) === 1 ? "" : "s"}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(order.order_date)}</TableCell>
              <TableCell className="text-muted-foreground">
                {order.due_date ? formatDate(order.due_date) : "—"}
              </TableCell>
              <TableCell className="text-right font-medium text-foreground">
                {formatCurrency(order.total, order.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasMore && (
        <div className="flex justify-center border-t border-border p-3">
          <Button type="button" variant="outline" size="sm" loading={isLoading} onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </SectionCard>
  )
}
