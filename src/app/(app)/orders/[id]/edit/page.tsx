import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { OrderForm } from "@/components/orders/order-form"
import { createClient } from "@/lib/supabase/server"
import { getCustomers, getOrderById } from "@/lib/supabase/orders"

interface EditOrderPageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrderPage({ params }: EditOrderPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [order, customers] = await Promise.all([getOrderById(supabase, id), getCustomers(supabase)])

  if (!order) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Edit Order" description={`Update ${order.order_number}.`} />

      <OrderForm mode="edit" order={order} customers={customers} />
    </div>
  )
}
