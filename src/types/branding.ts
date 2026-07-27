export interface BrandingSettings {
  applicationName: string
  companyName: string
  logoUrl: string | null
  logoPath: string | null
}

export const DEFAULT_BRANDING: BrandingSettings = {
  applicationName: "Mira Operations",
  companyName: "Mira Operations",
  logoUrl: null,
  logoPath: null,
}

export const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024

export const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/svg+xml", "image/webp"] as const
export type LogoMimeType = (typeof ALLOWED_LOGO_MIME_TYPES)[number]
