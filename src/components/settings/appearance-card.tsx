"use client"

import { Check } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { THEME_DESCRIPTIONS, THEME_LABELS, THEME_OPTIONS, THEME_SWATCHES } from "@/types/theme"

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()

  return (
    <SectionCard title="Appearance" description="Choose a theme for Mira Operations on this device.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" suppressHydrationWarning>
        {THEME_OPTIONS.map((option) => {
          const swatch = THEME_SWATCHES[option]
          const isActive = theme === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={isActive}
              suppressHydrationWarning
              className={cn(
                "group flex flex-col gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                isActive ? "border-primary ring-2 ring-primary/25" : "border-border"
              )}
            >
              <div
                className="relative flex h-14 items-center justify-center overflow-hidden rounded-lg border border-border/60"
                style={{ backgroundColor: swatch.background }}
              >
                <div
                  className="absolute bottom-1.5 left-1.5 right-1.5 h-6 rounded-md shadow-sm"
                  style={{ backgroundColor: swatch.card }}
                />
                <div
                  className="relative size-4 rounded-full shadow-sm"
                  style={{ backgroundColor: swatch.primary }}
                />
                {isActive && (
                  <div className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{THEME_LABELS[option]}</span>
                <span className="text-xs text-muted-foreground">{THEME_DESCRIPTIONS[option]}</span>
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        This preference is stored on this device only and does not sync across browsers or devices.
      </p>
    </SectionCard>
  )
}
