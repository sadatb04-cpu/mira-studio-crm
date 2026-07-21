import { Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { createClient } from "@/lib/supabase/server"
import { getCustomers } from "@/lib/supabase/orders"
import { CreateOrderWizard } from "@/app/(app)/orders/new/create-order-wizard"

export default async function NewOrderPage() {
  const supabase = await createClient()
  const customers = await getCustomers(supabase)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="New Order" description="Create a new order for an existing customer." />

      {customers.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add a customer before creating an order."
          />
        </SectionCard>
      ) : (
        <CreateOrderWizard customers={customers} />
      )}
    </div>
  )
}
