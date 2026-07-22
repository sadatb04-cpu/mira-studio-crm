export type UserRole =
  | "admin"
  | "operations_manager"
  | "production_manager"
  | "sales"
  | "employee"

export const USER_ROLES: UserRole[] = ["admin", "operations_manager", "production_manager", "sales", "employee"]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  operations_manager: "Operations Manager",
  production_manager: "Production Manager",
  sales: "Sales",
  employee: "Employee",
}

export type Department = "Operations" | "Production" | "Sales" | "Inventory" | "Management"

export const DEPARTMENTS: Department[] = ["Operations", "Production", "Sales", "Inventory", "Management"]

export const DEPARTMENT_LABELS: Record<Department, string> = {
  Operations: "Operations",
  Production: "Production",
  Sales: "Sales",
  Inventory: "Inventory",
  Management: "Management",
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  department: Department | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
