import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface FinanceSectionCardProps {
  href: string
  label: string
  description: string
  icon: LucideIcon
  valueLabel: string
}

export function FinanceSectionCard({ href, label, description, icon: Icon, valueLabel }: FinanceSectionCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <p className="text-lg font-semibold text-foreground">{valueLabel}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  )
}
