import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { CustomerForm } from "@/components/customers/customer-form"
import { createClient } from "@/lib/supabase/server"
import { getCustomer } from "@/lib/supabase/customers"

interface EditCustomerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const customer = await getCustomer(supabase, id)

  if (!customer) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Edit Customer" description={`Update ${customer.full_name}'s profile.`} />

      <SectionCard className="max-w-2xl">
        <CustomerForm mode="edit" customer={customer} />
      </SectionCard>
    </div>
  )
}
