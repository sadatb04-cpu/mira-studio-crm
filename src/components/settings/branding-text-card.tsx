"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBranding } from "@/app/actions/branding"
import type { BrandingSettings } from "@/types/branding"

interface BrandingTextCardProps {
  branding: BrandingSettings
  fallbackCompanyName: string
}

export function BrandingTextCard({ branding, fallbackCompanyName }: BrandingTextCardProps) {
  const router = useRouter()
  const [applicationName, setApplicationName] = useState(branding.applicationName)
  const [companyName, setCompanyName] = useState(branding.companyName || fallbackCompanyName || branding.companyName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateBranding({ applicationName, companyName })
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <SectionCard
      title="Names"
      description="Application Name appears in the login page, browser title, and sidebar. Company Name appears on reports, PDFs, and exports."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="application-name">
            Application Name<span className="text-destructive">*</span>
          </Label>
          <Input
            id="application-name"
            value={applicationName}
            maxLength={60}
            onChange={(event) => setApplicationName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branding-company-name">
            Company Name<span className="text-destructive">*</span>
          </Label>
          <Input
            id="branding-company-name"
            value={companyName}
            maxLength={120}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="button" size="sm" onClick={handleSubmit} loading={isPending}>
            Save Changes
          </Button>
          {success && <span className="text-sm text-muted-foreground">Saved.</span>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </SectionCard>
  )
}
