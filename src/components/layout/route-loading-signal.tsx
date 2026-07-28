"use client"

import { useEffect } from "react"

import { useGlobalLoader } from "@/components/providers/global-loader-provider"

// Placed inside a route segment's loading.tsx, which Next.js mounts as a
// Suspense fallback for exactly as long as that segment's navigation is
// pending, and unmounts the instant it resolves - this never fires for
// typing, filtering, sorting, or mutations, since none of those change
// the route segment. Renders nothing itself; GlobalLoaderProvider owns
// the actual visible overlay so every module shares one look.
export function RouteLoadingSignal() {
  const { startLoading, endLoading } = useGlobalLoader()

  useEffect(() => {
    startLoading()
    return () => endLoading()
  }, [startLoading, endLoading])

  return null
}
