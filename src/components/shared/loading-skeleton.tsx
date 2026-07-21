import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type LoadingSkeletonVariant = "text" | "card" | "table-row" | "circle"

interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant
  count?: number
  className?: string
}

function LoadingSkeleton({ variant = "text", count = 1, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} variant={variant} />
      ))}
    </div>
  )
}

function SkeletonItem({ variant }: { variant: LoadingSkeletonVariant }) {
  switch (variant) {
    case "circle":
      return <Skeleton className="size-10 rounded-full" />
    case "card":
      return <Skeleton className="h-32 w-full rounded-2xl" />
    case "table-row":
      return <Skeleton className="h-10 w-full rounded-lg" />
    case "text":
    default:
      return <Skeleton className="h-4 w-full max-w-sm rounded" />
  }
}

export { LoadingSkeleton }
export type { LoadingSkeletonProps, LoadingSkeletonVariant }
