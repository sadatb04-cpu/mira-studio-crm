"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Upload } from "lucide-react"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/shared/brand-logo"
import { createClient } from "@/lib/supabase/client"
import { removeBrandingLogo, updateBrandingLogo } from "@/app/actions/branding"
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_FILE_SIZE_BYTES } from "@/types/branding"
import type { BrandingSettings } from "@/types/branding"

const BUCKET = "branding"

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
}

interface BrandingLogoCardProps {
  branding: BrandingSettings
}

export function BrandingLogoCard({ branding }: BrandingLogoCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
      setError("Logo must be a PNG, SVG, or WEBP file.")
      return
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      setError("Logo must be 5 MB or smaller.")
      return
    }

    setIsUploading(true)

    startTransition(async () => {
      const supabase = createClient()
      const extension = EXTENSION_BY_MIME[file.type] ?? "png"
      const storagePath = `logo-${crypto.randomUUID()}.${extension}`

      // Same direct-to-Storage pattern as document uploads: the browser
      // client re-uses the session JWT, so bucket RLS (admin-only writes)
      // still applies - this doesn't bypass auth.
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
        contentType: file.type,
      })

      if (uploadError) {
        setIsUploading(false)
        setError(uploadError.message)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

      const result = await updateBrandingLogo({ logoUrl: publicUrl, logoPath: storagePath })

      setIsUploading(false)

      if (result.error) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removeBrandingLogo()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const busy = isPending || isUploading

  return (
    <SectionCard title="Company Logo" description="Shown in the sidebar, login page, splash screen, and browser tab.">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-dashed border-border p-2">
            <BrandLogo size="lg" />
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>PNG, SVG, or WEBP - up to 5 MB.</span>
            <span>Recommended size: 512x512.</span>
            <span>Only one logo is active at a time; uploading replaces it.</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_LOGO_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button type="button" size="sm" loading={isUploading} disabled={busy && !isUploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-3.5" data-icon="inline-start" />
            {branding.logoUrl ? "Replace Logo" : "Upload Logo"}
          </Button>
          {branding.logoUrl && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={handleRemove}>
              <Trash2 className="size-3.5" data-icon="inline-start" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
