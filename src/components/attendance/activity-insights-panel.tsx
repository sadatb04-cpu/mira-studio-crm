import { computeActivityInsights } from "@/lib/daily-activity-helpers"
import { formatActivityDuration } from "@/types/daily-activity"
import type { DailyActivity } from "@/types/daily-activity"

interface ActivityInsightsPanelProps {
  activities: DailyActivity[]
}

// Computed from the same activity list already fetched for the log table
// below it - no separate query needed.
export function ActivityInsightsPanel({ activities }: ActivityInsightsPanelProps) {
  const insights = computeActivityInsights(activities)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground">Average Completion Time</p>
        <p className="mt-1 text-xl font-semibold text-foreground">{formatActivityDuration(insights.averageCompletionMinutes)}</p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 text-xs text-muted-foreground">Most Common Activities</p>
        {insights.mostCommonActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities in this range yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {insights.mostCommonActivities.map((entry) => (
              <li key={entry.title} className="flex items-center justify-between text-sm">
                <span className="truncate text-foreground">{entry.title}</span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{entry.count}×</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
