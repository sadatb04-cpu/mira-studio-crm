"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { createElement } from "react"

import { DEFAULT_THEME, THEME_FAMILY, isMiraTheme, type MiraTheme } from "@/types/theme"

export const THEME_STORAGE_KEY = "mira-theme"

function applyTheme(theme: MiraTheme) {
  document.documentElement.setAttribute("data-theme", theme)
  document.documentElement.classList.toggle("dark", THEME_FAMILY[theme] === "dark")
}

function readStoredTheme(): MiraTheme {
  if (typeof window === "undefined") return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isMiraTheme(stored) ? stored : DEFAULT_THEME
}

interface ThemeContextValue {
  theme: MiraTheme
  setTheme: (next: MiraTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Client-only theme state, backed by localStorage - there is no per-user
// column in the schema for this, and it is a pure display preference with
// no server round-trip needed. A blocking inline script in layout.tsx
// applies the stored value before hydration to avoid a flash of the wrong
// theme; this provider keeps the picker UI and localStorage in sync after.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MiraTheme>(readStoredTheme)

  const setTheme = useCallback((next: MiraTheme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
    applyTheme(next)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return createElement(ThemeContext.Provider, { value }, children)
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
