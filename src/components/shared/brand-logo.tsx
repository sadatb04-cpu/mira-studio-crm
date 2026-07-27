"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { useBranding } from "@/components/providers/branding-provider"

type BrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_CLASSES: Record<BrandLogoSize, { box: string; text: string; radius: string }> = {
  xs: { box: "size-6", text: "text-[10px]", radius: "rounded-md" },
  sm: { box: "size-7", text: "text-xs", radius: "rounded-lg" },
  md: { box: "size-9", text: "text-sm", radius: "rounded-xl" },
  lg: { box: "size-14", text: "text-lg", radius: "rounded-2xl" },
  xl: { box: "size-20", text: "text-2xl", radius: "rounded-3xl" },
}

interface BrandLogoProps {
  size?: BrandLogoSize
  className?: string
}

// Every logo placement in the app renders through this component rather
// than hardcoding an "M" mark - if no logo has been uploaded, or the
// uploaded one fails to load, it falls back to a gradient initial mark
// instead of breaking the layout.
export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const { logoUrl, applicationName } = useBranding()
  const [failed, setFailed] = useState(false)
  const { box, text, radius } = SIZE_CLASSES[size]

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a static/local asset next/image can optimize
      <img
        src={logoUrl}
        alt={applicationName}
        onError={() => setFailed(true)}
        className={cn(box, radius, "object-contain", className)}
      />
    )
  }

  return (
    <span
      className={cn(
        box,
        radius,
        text,
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-brand-secondary font-bold text-primary-foreground shadow-lg shadow-primary/30",
        className
      )}
    >
      {applicationName.trim().charAt(0).toUpperCase() || "M"}
    </span>
  )
}
