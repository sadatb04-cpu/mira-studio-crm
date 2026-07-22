import Link from "next/link"
import { Briefcase, ClipboardList, Gem, Package, ShoppingBag, Users } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"

const ACTIONS = [
  { label: "New Order", href: "/orders/new", icon: ShoppingBag },
  { label: "New Customer", href: "/customers/new", icon: Users },
  { label: "New Production Job", href: "/production", icon: Gem },
  { label: "New Inventory Adjustment", href: "/inventory", icon: Package },
  { label: "New Task", href: "/tasks/new", icon: ClipboardList },
  { label: "New Employee", href: "/employees/new", icon: Briefcase },
]

export function QuickActionsCard() {
  return (
    <SectionCard title="Quick Actions">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((action) => (
          <Button key={action.label} asChild variant="outline" className="justify-start">
            <Link href={action.href}>
              <action.icon className="size-4" data-icon="inline-start" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </SectionCard>
  )
}
