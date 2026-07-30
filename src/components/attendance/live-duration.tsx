"use client"

import { useEffect, useState } from "react"

import { formatClock, formatDuration } from "@/types/attendance"

interface LiveDurationProps {
  /** Elapsed seconds already banked before the current running segment (or the whole total, if not running). */
  baseSeconds: number
  /** When this segment started, if one is currently running. */
  segmentStartedAt: string | null
  /** Whether a segment is actively running - when false, this renders a frozen baseSeconds with no ticking. */
  running: boolean
  display: "clock" | "duration"
  className?: string
}

// Isolates the 1-second tick to just this one text node, instead of a
// shared `now` state on a parent that re-renders the whole card (badges,
// buttons, other stat tiles) every second. Several of these can be mounted
// side by side, each with its own independent interval, which is a cheap
// trade for not re-rendering everything around them every tick.
export function LiveDuration({ baseSeconds, segmentStartedAt, running, display, className }: LiveDurationProps) {
  // Starts null so the first client render matches the server-rendered
  // output exactly (frozen totals, zero live elapsed) - seeding from
  // Date.now() during render would make server/client disagree by
  // whatever time passed between them, causing a hydration mismatch.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [running])

  const segmentElapsed =
    running && segmentStartedAt && now !== null
      ? Math.max(0, Math.floor((now - new Date(segmentStartedAt).getTime()) / 1000))
      : 0

  const totalSeconds = baseSeconds + segmentElapsed
  const text = display === "clock" ? formatClock(totalSeconds) : formatDuration(totalSeconds)

  return <span className={className}>{text}</span>
}
