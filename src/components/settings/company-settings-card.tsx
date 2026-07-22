"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateCompanyInfo } from "@/app/actions/settings"
import { TIMEZONE_OPTIONS } from "@/types/settings"
import type { CompanyInfo } from "@/types/settings"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface CompanySettingsCardProps {
  companyInfo: CompanyInfo
}

export function CompanySettingsCard({ companyInfo }: CompanySettingsCardProps) {
  const router = useRouter()
  const [form, setForm] = useState(companyInfo)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateCompanyInfo(form)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <SectionCard title="Company Information" description="Shown across invoices, exports, and the CRM header.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">
              Company Name<span className="text-destructive">*</span>
            </Label>
            <Input id="company-name" value={form.name} onChange={(event) => update("name", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-email">
              Email<span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-phone">Phone</Label>
            <Input id="company-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-website">Website</Label>
            <Input
              id="company-website"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="company-address">Address</Label>
            <Input id="company-address" value={form.address} onChange={(event) => update("address", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-city">City</Label>
            <Input id="company-city" value={form.city} onChange={(event) => update("city", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-state">State</Label>
            <Input id="company-state" value={form.state} onChange={(event) => update("state", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-postal-code">Postal Code</Label>
            <Input
              id="company-postal-code"
              value={form.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-country">Country</Label>
            <Input id="company-country" value={form.country} onChange={(event) => update("country", event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-tax-number">Tax Number</Label>
            <Input
              id="company-tax-number"
              value={form.taxNumber}
              onChange={(event) => update("taxNumber", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-currency">
              Currency<span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-currency"
              value={form.currency}
              maxLength={3}
              onChange={(event) => update("currency", event.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-timezone">
              Time Zone<span className="text-destructive">*</span>
            </Label>
            <select
              id="company-timezone"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value as CompanyInfo["timezone"])}
              className={selectClassName}
            >
              {TIMEZONE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {success && <span className="text-sm text-muted-foreground">Saved.</span>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </SectionCard>
  )
}
