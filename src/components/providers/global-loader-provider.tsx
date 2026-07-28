"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

import { LoadingOverlay } from "@/components/layout/loading-overlay"

const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 350

interface GlobalLoaderContextValue {
  startLoading: () => void
  endLoading: () => void
}

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(null)

// A pending-count model (not a single boolean) so overlapping triggers -
// e.g. a route transition plus a manual startLoading() for a large fetch -
// only hide once every caller has called endLoading(). Two timers enforce
// the brief's two constraints: don't show for anything under 200ms, and
// once shown, never hide before 350ms so it can't flash.
export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const pendingCountRef = useRef(0)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownAtRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)

  const startLoading = useCallback(() => {
    pendingCountRef.current += 1

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    if (shownAtRef.current !== null || showTimerRef.current) return

    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null
      if (pendingCountRef.current > 0) {
        shownAtRef.current = Date.now()
        setVisible(true)
      }
    }, SHOW_DELAY_MS)
  }, [])

  const endLoading = useCallback(() => {
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1)
    if (pendingCountRef.current > 0) return

    if (showTimerRef.current) {
      // Resolved before the show-delay elapsed - never became visible.
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
      return
    }

    if (shownAtRef.current === null) return

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      shownAtRef.current = null
      setVisible(false)
    }, remaining)
  }, [])

  const value = useMemo(() => ({ startLoading, endLoading }), [startLoading, endLoading])

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <LoadingOverlay visible={visible} />
    </GlobalLoaderContext.Provider>
  )
}

export function useGlobalLoader(): GlobalLoaderContextValue {
  const context = useContext(GlobalLoaderContext)
  if (!context) {
    throw new Error("useGlobalLoader must be used within a GlobalLoaderProvider")
  }
  return context
}
