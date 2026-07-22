import Link from "next/link"
import { format } from "date-fns"
import { CalendarClock } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StatusTone } from "@/components/shared/status-badge"
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

function formatDate(value: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

interface UpcomingOrdersCardProps {
  orders: OrderListItem[]
}

export function UpcomingOrdersCard({ orders }: UpcomingOrdersCardProps) {
  return (
    <SectionCard title="Upcoming Orders" description="Next orders due, soonest first." contentClassName="px-0">
      {orders.length === 0 ? (
        <div className="px-4">
          <EmptyState icon={CalendarClock} title="No upcoming orders" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">Order Number</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link href={`/orders/${order.id}`} className="block hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{order.customer?.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(order.due_date)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={ORDER_STATUS_LABELS[order.status]} tone={STATUS_TONE[order.status]} />
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
