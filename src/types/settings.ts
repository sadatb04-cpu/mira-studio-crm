import type { DateRangePreset } from "@/types/report"
import type { ProductionPriority } from "@/types/production"
import type { TaskPriority } from "@/types/task"

export const SETTINGS_KEYS = {
  companyInfo: "company_info",
  userPreferences: "user_preferences",
  businessRules: "business_rules",
} as const

export const DATE_FORMAT_OPTIONS = ["MMM d, yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"] as const
export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number]

export const DATE_FORMAT_LABELS: Record<DateFormatOption, string> = {
  "MMM d, yyyy": "Jan 5, 2026",
  "MM/dd/yyyy": "01/05/2026",
  "dd/MM/yyyy": "05/01/2026",
  "yyyy-MM-dd": "2026-01-05",
}

export const TIME_FORMAT_OPTIONS = ["h:mm a", "HH:mm"] as const
export type TimeFormatOption = (typeof TIME_FORMAT_OPTIONS)[number]

export const TIME_FORMAT_LABELS: Record<TimeFormatOption, string> = {
  "h:mm a": "2:30 PM (12-hour)",
  "HH:mm": "14:30 (24-hour)",
}

// Excludes "custom" (needs explicit from/to dates) and "year" (Reports-only,
// see report.ts) - only presets a default dashboard load can resolve on its own.
export const DEFAULT_DASHBOARD_RANGE_OPTIONS = ["today", "7d", "30d", "90d", "12m"] as const satisfies readonly DateRangePreset[]

export const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const
export type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number]

export interface CompanyInfo {
  name: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  taxNumber: string
  currency: string
  timezone: TimezoneOption
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  taxNumber: "",
  currency: "USD",
  timezone: "UTC",
}

export type DashboardRangeDefault = (typeof DEFAULT_DASHBOARD_RANGE_OPTIONS)[number]

export interface UserPreferences {
  dateFormat: DateFormatOption
  timeFormat: TimeFormatOption
  defaultDashboardRange: DashboardRangeDefault
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dateFormat: "MMM d, yyyy",
  timeFormat: "h:mm a",
  defaultDashboardRange: "30d",
}

export interface BusinessRules {
  defaultTaskPriority: TaskPriority
  defaultProductionPriority: ProductionPriority
}

// Mirrors the live DB column defaults (tasks.priority / production_jobs.priority)
// so an unconfigured org sees the same behavior it already has today.
export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  defaultTaskPriority: "medium",
  defaultProductionPriority: "normal",
}

export interface SettingsBundle {
  companyInfo: CompanyInfo
  userPreferences: UserPreferences
  businessRules: BusinessRules
  lastUpdated: string | null
  lastUpdatedByName: string | null
}

export interface DatabaseSummary {
  orders: number
  customers: number
  tasks: number
  productionJobs: number
  inventoryItems: number
  employees: number
  documents: number
}

export type ThemePreference = "light" | "dark" | "system"

export const THEME_OPTIONS: ThemePreference[] = ["light", "dark", "system"]

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}
