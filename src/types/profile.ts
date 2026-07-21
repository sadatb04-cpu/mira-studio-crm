export type UserRole =
  | "admin"
  | "operations_manager"
  | "production_manager"
  | "sales"
  | "employee"

export type Department = "Operations" | "Production" | "Sales" | "Inventory" | "Management"

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
