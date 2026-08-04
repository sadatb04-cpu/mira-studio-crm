import type { AccountStatus } from "@/types/user-account"
import type { UserRole } from "@/types/profile"

export const PERMISSION_MODULES = [
  "dashboard",
  "orders",
  "quotations",
  "customers",
  "production",
  "inventory",
  "tasks",
  "documents",
  "employees",
  "attendance",
  "reports",
  "settings",
  "finance",
] as const
export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  quotations: "Quotations",
  customers: "Customers",
  production: "Production",
  inventory: "Inventory",
  tasks: "Tasks",
  documents: "Documents",
  employees: "Employees",
  attendance: "Attendance",
  reports: "Reports",
  settings: "Settings",
  finance: "Finance",
}

export type ModuleAction = "view" | "create" | "edit" | "delete"

export interface ModulePermission {
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export const NO_MODULE_ACCESS: ModulePermission = { can_view: false, can_create: false, can_edit: false, can_delete: false }
export const FULL_MODULE_ACCESS: ModulePermission = { can_view: true, can_create: true, can_edit: true, can_delete: true }

export const SPECIAL_PERMISSIONS = [
  "release_to_production",
  "approve_quotation",
  "send_quotation",
  "view_financial_pricing",
  "manage_employees",
  "manage_users",
  "manage_permissions",
  "export_reports",
  "delete_documents",
  "view_activity_logs",
] as const
export type SpecialPermission = (typeof SPECIAL_PERMISSIONS)[number]

export const SPECIAL_PERMISSION_LABELS: Record<SpecialPermission, string> = {
  release_to_production: "Release to Production",
  approve_quotation: "Approve Quotation",
  send_quotation: "Send Quotation",
  view_financial_pricing: "View Financial Pricing",
  manage_employees: "Manage Employees",
  manage_users: "Manage Users",
  manage_permissions: "Manage Permissions",
  export_reports: "Export Reports",
  delete_documents: "Delete Documents",
  view_activity_logs: "View Activity Logs",
}

export interface UserPermissions {
  isAdmin: boolean
  modules: Record<PermissionModule, ModulePermission>
  special: Record<SpecialPermission, boolean>
}

export interface RoleTemplate {
  key: string
  label: string
  modulePermissions: Partial<Record<PermissionModule, ModulePermission>>
  special: SpecialPermission[]
}

// Non-admin templates deliberately stop short of delete access - the
// cautious default for a brand-new permission system. Admins can still
// loosen this per user afterward from Settings -> User Access.
const STANDARD_ACCESS: ModulePermission = { can_view: true, can_create: true, can_edit: true, can_delete: false }

function modulesFor(modules: PermissionModule[], access: ModulePermission): Partial<Record<PermissionModule, ModulePermission>> {
  return Object.fromEntries(modules.map((module) => [module, access]))
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "admin",
    label: "Admin",
    modulePermissions: modulesFor([...PERMISSION_MODULES], FULL_MODULE_ACCESS),
    special: [...SPECIAL_PERMISSIONS],
  },
  {
    key: "sales",
    label: "Sales",
    modulePermissions: modulesFor(
      ["dashboard", "orders", "customers", "quotations", "tasks", "documents", "attendance"],
      STANDARD_ACCESS
    ),
    special: ["send_quotation", "approve_quotation", "view_financial_pricing"],
  },
  {
    key: "production",
    label: "Production",
    modulePermissions: modulesFor(["dashboard", "production", "inventory", "tasks", "attendance", "documents"], STANDARD_ACCESS),
    special: ["release_to_production"],
  },
  {
    key: "inventory",
    label: "Inventory",
    modulePermissions: modulesFor(["dashboard", "inventory", "tasks", "attendance", "documents"], STANDARD_ACCESS),
    special: [],
  },
  {
    key: "employee",
    label: "Employee",
    modulePermissions: modulesFor(["dashboard", "tasks", "attendance", "documents"], STANDARD_ACCESS),
    special: [],
  },
]

export interface UserAccessListItem {
  id: string
  full_name: string
  email: string
  role: UserRole
  accountStatus: AccountStatus
  lastSignInAt: string | null
}
