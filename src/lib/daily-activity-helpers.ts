import type { ActivityInsights, ActivitySummary, ActivityTimelineEvent, DailyActivity } from "@/types/daily-activity"

// Pure helpers with no Supabase dependency - safe to import from client
// components (the timeline/summary UI recomputes these from data already
// fetched server-side) as well as the server-side data layer.

export function buildActivityTimeline(
  sessions: { checkIn: string | null }[],
  activities: DailyActivity[]
): ActivityTimelineEvent[] {
  const events: ActivityTimelineEvent[] = []

  for (const session of sessions) {
    if (session.checkIn) events.push({ time: session.checkIn, label: "Checked In" })
  }

  for (const activity of activities) {
    if (activity.startedAt) events.push({ time: activity.startedAt, label: `Started ${activity.activityTitle}` })
    if (activity.completedAt) events.push({ time: activity.completedAt, label: `Completed ${activity.activityTitle}` })
  }

  return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

export function summarizeActivities(activities: DailyActivity[]): ActivitySummary {
  const completed = activities.filter((activity) => activity.status === "completed")
  const totalProductiveMinutes = completed.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0)

  return {
    total: activities.length,
    completed: completed.length,
    pending: activities.filter((activity) => activity.status === "pending").length,
    inProgress: activities.filter((activity) => activity.status === "in_progress").length,
    totalProductiveMinutes,
    averageDurationMinutes: completed.length > 0 ? Math.round(totalProductiveMinutes / completed.length) : 0,
  }
}

export function computeActivityInsights(activities: DailyActivity[]): ActivityInsights {
  const completed = activities.filter((activity) => activity.durationMinutes !== null)
  const totalMinutes = completed.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0)

  const counts = new Map<string, number>()
  for (const activity of activities) {
    counts.set(activity.activityTitle, (counts.get(activity.activityTitle) ?? 0) + 1)
  }

  const mostCommonActivities = [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalActivities: activities.length,
    averageCompletionMinutes: completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
    mostCommonActivities,
  }
}
