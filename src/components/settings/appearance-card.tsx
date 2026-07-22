"use client"

import { Monitor, Moon, Sun } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme"
import { THEME_LABELS, THEME_OPTIONS } from "@/types/settings"
import type { ThemePreference } from "@/types/settings"

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()

  return (
    <SectionCard title="Appearance" description="Choose how Mira Operations looks on this device.">
      <div className="flex items-center gap-2" suppressHydrationWarning>
        {THEME_OPTIONS.map((option) => {
          const Icon = THEME_ICONS[option]
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={theme === option ? "default" : "outline"}
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
              suppressHydrationWarning
            >
              <Icon className="size-3.5" data-icon="inline-start" />
              {THEME_LABELS[option]}
            </Button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This preference is stored on this device only and does not sync across browsers or devices.
      </p>
    </SectionCard>
  )
}
