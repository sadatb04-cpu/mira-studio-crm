import {
  LayoutDashboard,
  ShoppingBag,
  Gem,
  Users,
  Package,
  ClipboardList,
  Briefcase,
  FileText,
  LineChart,
  Settings,
  Clock,
  Wallet,
  LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/profile";
import type { PermissionModule } from "@/types/permission";

export type { UserRole };

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badge?: {
    text: string;
    variant?: "gold" | "default" | "outline" | "secondary";
  };
  children?: NavigationItem[];
  roles?: UserRole[];
  /** Hidden from the sidebar when the user lacks View for this module. Omitted for items with no permission-system equivalent (e.g. Tasks). */
  permissionModule?: PermissionModule;
  isEnabled?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Main dashboard containing key performance indicators and summaries.",
    isEnabled: true,
    permissionModule: "dashboard",
  },
  {
    id: "orders",
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
    description: "Manage orders, bespoke commissions, and transactions.",
    isEnabled: true,
    permissionModule: "orders",
  },
  {
    id: "production",
    label: "Production",
    href: "/production",
    icon: Gem,
    description: "Track workshop manufacturing, progress, and quality assurance.",
    isEnabled: true,
    permissionModule: "production",
  },
  {
    id: "customers",
    label: "Customers",
    href: "/customers",
    icon: Users,
    description: "Manage customer profiles, purchase history, and relationships.",
    isEnabled: true,
    permissionModule: "customers",
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    description: "Monitor raw materials, precious elements, and stock levels.",
    isEnabled: true,
    permissionModule: "inventory",
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: ClipboardList,
    description: "View and coordinate team tasks, assignments, and scheduling.",
    isEnabled: true,
    permissionModule: "tasks",
  },
  {
    id: "employees",
    label: "Employees",
    href: "/employees",
    icon: Briefcase,
    description: "Manage workforce records, schedules, and permissions.",
    isEnabled: true,
    permissionModule: "employees",
  },
  {
    id: "attendance",
    label: "Attendance",
    href: "/attendance",
    icon: Clock,
    description: "Track work sessions, breaks, and daily attendance.",
    isEnabled: true,
    permissionModule: "attendance",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileText,
    description: "Access official documents, logs, and billing files.",
    isEnabled: true,
    permissionModule: "documents",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: LineChart,
    description: "Generate sales, production, and performance analytics.",
    isEnabled: true,
    permissionModule: "reports",
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    description: "Track manufacturing invoices, seller profit, and company expenses.",
    isEnabled: true,
    permissionModule: "finance",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure system options, integration endpoints, and parameters.",
    isEnabled: true,
    permissionModule: "settings",
    roles: ["admin"],
  },
];
