import { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"

interface PlaceholderPageProps {
  title: string
  description?: string
  children?: ReactNode
}

function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title={title} description={description} />
      <SectionCard>
        {children ?? <EmptyState title="Coming Soon" description="This module will be implemented in an upcoming sprint." />}
      </SectionCard>
    </div>
  )
}

export { PlaceholderPage }
export type { PlaceholderPageProps }
