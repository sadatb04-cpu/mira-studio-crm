import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Placeholder shown by next/dynamic while a chart's recharts-backed chunk
// loads - matches every chart's actual h-64 body so nothing shifts layout
// once the real chart mounts.
export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}
