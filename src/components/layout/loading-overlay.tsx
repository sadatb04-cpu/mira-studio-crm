"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/shared/brand-logo"
import { useBranding } from "@/components/providers/branding-provider"

const FADE_MS = 250
const DOT_INTERVAL_MS = 450

function useLoadingDots() {
  const [count, setCount] = useState(1)

  useEffect(() => {
    const id = setInterval(() => setCount((current) => (current % 3) + 1), DOT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return ".".repeat(count)
}

interface LoadingOverlayProps {
  visible: boolean
}

// Rendered once at the root by GlobalLoaderProvider. `visible` is the
// logical show/hide signal (already debounced/held by the provider); this
// component only owns the fade transition, so hiding never cuts abruptly -
// same mount-then-fade-then-unmount shape as SplashScreen.
export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const { applicationName } = useBranding()
  const dots = useLoadingDots()
  const [mounted, setMounted] = useState(visible)
  const [fadingOut, setFadingOut] = useState(false)
  const [prevVisible, setPrevVisible] = useState(visible)

  // Derived-state-during-render, not an effect: the moment `visible` flips,
  // react synchronously in the same render pass rather than one tick later.
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setMounted(true)
      setFadingOut(false)
    } else {
      setFadingOut(true)
    }
  }

  useEffect(() => {
    if (!fadingOut) return
    const timer = setTimeout(() => setMounted(false), FADE_MS)
    return () => clearTimeout(timer)
  }, [fadingOut])

  if (!mounted) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-lg transition-opacity ease-premium",
        fadingOut ? "opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        <div
          className="splash-glow absolute size-24 rounded-full bg-primary/40 blur-2xl"
          style={{ animation: "splash-glow 2.4s ease-in-out infinite" }}
        />
        <div
          className="splash-logo relative"
          style={{ animation: "splash-logo-in 0.4s ease-out both, splash-float 3s ease-in-out 0.4s infinite" }}
        >
          <BrandLogo size="lg" />
        </div>
      </div>
      <span className="text-sm font-medium tracking-wide text-muted-foreground">
        Loading {applicationName}
        <span className="inline-block w-4 text-left">{dots}</span>
      </span>
    </div>
  )
}
