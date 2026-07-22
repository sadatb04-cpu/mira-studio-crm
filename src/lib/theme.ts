"use client"

import { useCallback, useEffect, useState } from "react"

import { THEME_OPTIONS } from "@/types/settings"
import type { ThemePreference } from "@/types/settings"

export const THEME_STORAGE_KEY = "mira-theme"

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function applyTheme(theme: ThemePreference) {
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", isDark)
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return THEME_OPTIONS.includes(stored as ThemePreference) ? (stored as ThemePreference) : "system"
}

// Client-only theme state, backed by localStorage - there is no per-user
// column in the schema for this, and it is a pure display preference with
// no server round-trip needed. A blocking inline script in layout.tsx
// applies the stored value before hydration to avoid a flash of the wrong
// theme; this hook keeps the toggle UI and localStorage in sync afterward.
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    function handleSystemChange() {
      const current = (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null) ?? "system"
      if (current === "system") applyTheme("system")
    }
    media.addEventListener("change", handleSystemChange)
    return () => media.removeEventListener("change", handleSystemChange)
  }, [])

  const setTheme = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
    applyTheme(next)
  }, [])

  return { theme, setTheme }
}
