import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { InventoryCategoryDef } from "@/types/inventory-categories"

interface CategoryLandingCardProps {
  category: InventoryCategoryDef
  countLabel?: string
}

export function CategoryLandingCard({ category, countLabel }: CategoryLandingCardProps) {
  const Icon = category.icon

  const content = (
    <CardContent className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{category.label}</p>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
        {category.isImplemented ? (
          <p className="text-lg font-semibold text-foreground">{countLabel}</p>
        ) : (
          <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Coming Soon</span>
        )}
      </div>
      {category.isImplemented && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
    </CardContent>
  )

  if (!category.isImplemented) {
    return (
      <Card className={cn("opacity-70 hover:-translate-y-0")}>
        {content}
      </Card>
    )
  }

  return (
    <Link href={category.href}>
      <Card className="cursor-pointer transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:shadow-md">
        {content}
      </Card>
    </Link>
  )
}
