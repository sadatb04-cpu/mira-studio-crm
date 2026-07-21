import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FilterBarProps {
  children: React.ReactNode
  actions?: React.ReactNode
  onClear?: () => void
  hasActiveFilters?: boolean
  className?: string
}

function FilterBar({ children, actions, onClear, hasActiveFilters, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-2",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        {hasActiveFilters && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5" data-icon="inline-start" />
            Clear filters
          </Button>
        )}
        {actions}
      </div>
    </div>
  )
}

export { FilterBar }
export type { FilterBarProps }
