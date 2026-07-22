import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { CustomerForm } from "@/components/customers/customer-form"

export default function NewCustomerPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="New Customer" description="Add a new customer profile." />

      <SectionCard className="max-w-2xl">
        <CustomerForm mode="create" />
      </SectionCard>
    </div>
  )
}
