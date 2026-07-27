"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/shared/brand-logo"
import { useBranding } from "@/components/providers/branding-provider"
import { clearLoginSplashFlag } from "@/app/actions/auth"

const HOLD_MS = 1800
const FADE_MS = 300

interface SplashScreenProps {
  show: boolean
}

// Only rendered right after a successful login (see the "mira-show-splash"
// cookie set in login()); never on a plain page refresh. The dashboard
// content underneath is already server-rendered by the time this mounts,
// so the fixed hold simply covers it for a beat rather than blocking
// anything - there's no separate "wait for data" state to synchronize.
export function SplashScreen({ show }: SplashScreenProps) {
  const { applicationName } = useBranding()
  const [visible, setVisible] = useState(show)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (!show) return

    void clearLoginSplashFlag()

    const fadeTimer = setTimeout(() => setFadingOut(true), HOLD_MS)
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_MS)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [show])

  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-xl transition-opacity ease-premium",
        fadingOut ? "opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      <div className="relative flex items-center justify-center">
        <div
          className="splash-glow absolute size-28 rounded-full bg-primary/40 blur-2xl"
          style={{ animation: "splash-glow 2.4s ease-in-out infinite" }}
        />
        <div
          className="splash-logo relative"
          style={{
            animation: "splash-logo-in 0.6s ease-out both, splash-float 3s ease-in-out 0.6s infinite",
          }}
        >
          <BrandLogo size="xl" />
        </div>
      </div>
      <span className="text-sm font-medium tracking-wide text-muted-foreground">{applicationName}</span>
    </div>
  )
}
