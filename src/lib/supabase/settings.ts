import type { SupabaseClient } from "@supabase/supabase-js"

import { DEFAULT_BUSINESS_RULES, DEFAULT_COMPANY_INFO, DEFAULT_USER_PREFERENCES, SETTINGS_KEYS } from "@/types/settings"
import type { BusinessRules, CompanyInfo, DatabaseSummary, SettingsBundle, UserPreferences } from "@/types/settings"
import type { BusinessRulesInput, CompanyInfoInput, UserPreferencesInput } from "@/lib/validations/settings"
import type { Json } from "@/types/database"

interface SettingsRow {
  key: string
  value: unknown
  updated_at: string
  updated_by: string | null
}

// A non-admin session simply cannot see any rows here (RLS restricts the
// settings table to admin role for every operation, by design) - in that
// case this resolves to the defaults below, identical to a fresh install.
export async function getSettingsBundle(supabase: SupabaseClient): Promise<SettingsBundle> {
  const keys = Object.values(SETTINGS_KEYS)

  const { data, error } = await supabase.from("settings").select("key, value, updated_at, updated_by").in("key", keys)
  if (error) throw error

  const rows = (data ?? []) as SettingsRow[]
  const byKey = new Map(rows.map((row) => [row.key, row]))

  const companyInfo = { ...DEFAULT_COMPANY_INFO, ...(byKey.get(SETTINGS_KEYS.companyInfo)?.value as Partial<CompanyInfo> | undefined) }
  const userPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    ...(byKey.get(SETTINGS_KEYS.userPreferences)?.value as Partial<UserPreferences> | undefined),
  }
  const businessRules = {
    ...DEFAULT_BUSINESS_RULES,
    ...(byKey.get(SETTINGS_KEYS.businessRules)?.value as Partial<BusinessRules> | undefined),
  }

  let lastUpdated: string | null = null
  let lastUpdatedBy: string | null = null
  for (const row of rows) {
    if (!lastUpdated || row.updated_at > lastUpdated) {
      lastUpdated = row.updated_at
      lastUpdatedBy = row.updated_by
    }
  }

  let lastUpdatedByName: string | null = null
  if (lastUpdatedBy) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", lastUpdatedBy).maybeSingle()
    lastUpdatedByName = profile?.full_name ?? null
  }

  return { companyInfo, userPreferences, businessRules, lastUpdated, lastUpdatedByName }
}

export async function getDatabaseSummary(supabase: SupabaseClient): Promise<DatabaseSummary> {
  const tables = ["orders", "customers", "tasks", "production_jobs", "inventory_items", "profiles", "documents"] as const

  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
      if (error) throw error
      return count ?? 0
    })
  )

  const [orders, customers, tasks, productionJobs, inventoryItems, employees, documents] = counts

  return { orders, customers, tasks, productionJobs, inventoryItems, employees, documents }
}

async function upsertSetting(
  supabase: SupabaseClient,
  key: string,
  value: unknown,
  description: string,
  updatedBy: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from("settings")
    .upsert({ key, value: value as Json, description, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("id")
    .single()

  if (error) throw error
  return data.id as string
}

// Best-effort only - matches the non-throwing activity logging pattern used
// throughout the app (e.g. createOrder() in orders.ts).
async function logActivity(supabase: SupabaseClient, entry: { entity_id: string; action: string; description?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    entity_type: "setting",
    entity_id: entry.entity_id,
    action: entry.action,
    description: entry.description ?? null,
    actor_id: user?.id ?? null,
  })
}

export async function updateCompanyInfo(supabase: SupabaseClient, input: CompanyInfoInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const id = await upsertSetting(supabase, SETTINGS_KEYS.companyInfo, input, "Company profile shown across the CRM.", user?.id ?? null)
  await logActivity(supabase, { entity_id: id, action: "company_updated", description: "Company information updated." })
}

export async function updateUserPreferences(supabase: SupabaseClient, input: UserPreferencesInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const id = await upsertSetting(supabase, SETTINGS_KEYS.userPreferences, input, "Organization-wide display defaults.", user?.id ?? null)
  await logActivity(supabase, { entity_id: id, action: "preferences_updated", description: "User preferences updated." })
}

export async function updateBusinessRules(supabase: SupabaseClient, input: BusinessRulesInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const id = await upsertSetting(supabase, SETTINGS_KEYS.businessRules, input, "Default priority values for new tasks and production jobs.", user?.id ?? null)
  await logActivity(supabase, { entity_id: id, action: "business_rules_updated", description: "Business rules updated." })
}

export async function exportSettingsCsv(supabase: SupabaseClient): Promise<string> {
  const settings = await getSettingsBundle(supabase)

  return [
    "Mira Operations - Settings Export",
    "",
    "Section,Field,Value",
    `Company Information,Name,${settings.companyInfo.name}`,
    `Company Information,Email,${settings.companyInfo.email}`,
    `Company Information,Phone,${settings.companyInfo.phone}`,
    `Company Information,Website,${settings.companyInfo.website}`,
    `Company Information,Address,${settings.companyInfo.address}`,
    `Company Information,City,${settings.companyInfo.city}`,
    `Company Information,State,${settings.companyInfo.state}`,
    `Company Information,Postal Code,${settings.companyInfo.postalCode}`,
    `Company Information,Country,${settings.companyInfo.country}`,
    `Company Information,Tax Number,${settings.companyInfo.taxNumber}`,
    `Company Information,Currency,${settings.companyInfo.currency}`,
    `Company Information,Time Zone,${settings.companyInfo.timezone}`,
    `User Preferences,Date Format,${settings.userPreferences.dateFormat}`,
    `User Preferences,Time Format,${settings.userPreferences.timeFormat}`,
    `User Preferences,Default Dashboard Range,${settings.userPreferences.defaultDashboardRange}`,
    `Business Rules,Default Task Priority,${settings.businessRules.defaultTaskPriority}`,
    `Business Rules,Default Production Priority,${settings.businessRules.defaultProductionPriority}`,
  ].join("\n")
}

export async function exportConfigurationJson(supabase: SupabaseClient): Promise<string> {
  const settings = await getSettingsBundle(supabase)
  return JSON.stringify(settings, null, 2)
}

export async function exportDatabaseSummaryCsv(supabase: SupabaseClient): Promise<string> {
  const summary = await getDatabaseSummary(supabase)

  return [
    "Mira Operations - Database Summary Export",
    `Generated,${new Date().toISOString()}`,
    "",
    "Table,Row Count",
    `Orders,${summary.orders}`,
    `Customers,${summary.customers}`,
    `Tasks,${summary.tasks}`,
    `Production Jobs,${summary.productionJobs}`,
    `Inventory Items,${summary.inventoryItems}`,
    `Employees,${summary.employees}`,
    `Documents,${summary.documents}`,
  ].join("\n")
}
