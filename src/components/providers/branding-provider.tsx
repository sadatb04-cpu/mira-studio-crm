"use client"

import { createContext, useContext } from "react"

import { DEFAULT_BRANDING } from "@/types/branding"
import type { BrandingSettings } from "@/types/branding"

const BrandingContext = createContext<BrandingSettings>(DEFAULT_BRANDING)

interface BrandingProviderProps {
  branding: BrandingSettings
  children: React.ReactNode
}

// Fetched once, at the root layout, and threaded down via context so no
// page or component re-fetches branding on its own. Always resolves to a
// usable BrandingSettings (falls back to DEFAULT_BRANDING) so consumers
// never need a null-check before rendering the logo/name.
export function BrandingProvider({ branding, children }: BrandingProviderProps) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}

export function useBranding(): BrandingSettings {
  return useContext(BrandingContext)
}
