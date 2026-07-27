"use client"

import { CardDescription, CardTitle } from "@/components/ui/card"
import { BrandLogo } from "@/components/shared/brand-logo"
import { useBranding } from "@/components/providers/branding-provider"

export function LoginBrandMark() {
  return <BrandLogo size="lg" />
}

export function LoginHeading() {
  const { applicationName } = useBranding()

  return (
    <>
      <CardTitle className="text-xl">Sign in to {applicationName}</CardTitle>
      <CardDescription>Enter your credentials to continue.</CardDescription>
    </>
  )
}
