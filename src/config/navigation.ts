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
  LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/profile";

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
  },
  {
    id: "orders",
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
    description: "Manage orders, bespoke commissions, and transactions.",
    isEnabled: true,
  },
  {
    id: "production",
    label: "Production",
    href: "/production",
    icon: Gem,
    description: "Track workshop manufacturing, progress, and quality assurance.",
    isEnabled: true,
  },
  {
    id: "customers",
    label: "Customers",
    href: "/customers",
    icon: Users,
    description: "Manage customer profiles, purchase history, and relationships.",
    isEnabled: true,
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    description: "Monitor raw materials, precious elements, and stock levels.",
    isEnabled: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: ClipboardList,
    description: "View and coordinate team tasks, assignments, and scheduling.",
    isEnabled: true,
  },
  {
    id: "employees",
    label: "Employees",
    href: "/employees",
    icon: Briefcase,
    description: "Manage workforce records, schedules, and permissions.",
    isEnabled: true,
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileText,
    description: "Access official documents, logs, and billing files.",
    isEnabled: true,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: LineChart,
    description: "Generate sales, production, and performance analytics.",
    isEnabled: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure system options, integration endpoints, and parameters.",
    isEnabled: true,
    roles: ["admin"],
  },
];
