"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { navigationItems } from "@/config/navigation";
import { NavLink, isNavItemActive } from "@/components/layout/nav-link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useBranding } from "@/components/providers/branding-provider";
import type { UserRole } from "@/types/profile";
import type { UserPermissions } from "@/types/permission";

const ITEM_HEIGHT = 36;
const ITEM_GAP = 4;

interface SidebarProps {
  role?: UserRole | null;
  permissions?: UserPermissions | null;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ role, permissions, onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { applicationName } = useBranding();

  const items = navigationItems.filter((item) => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    // No View permission for this module -> hidden from the sidebar entirely.
    if (item.permissionModule && permissions && !permissions.modules[item.permissionModule].can_view) return false;
    return true;
  });

  const activeIndex = useMemo(
    () => items.findIndex((item) => item.isEnabled !== false && isNavItemActive(pathname, item.href)),
    [items, pathname]
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        <BrandLogo size="sm" />
        {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">{applicationName}</span>}
      </div>
      <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 w-1 rounded-full bg-primary transition-all duration-200 ease-premium"
          style={{
            height: ITEM_HEIGHT - 12,
            top: activeIndex === -1 ? 0 : activeIndex * (ITEM_HEIGHT + ITEM_GAP) + 6,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />
        {items.map((item) => (
          <NavLink key={item.id} item={item} onNavigate={onNavigate} collapsed={collapsed} />
        ))}
      </nav>
      {onToggleCollapse && (
        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 transition-all duration-150 ease-premium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );
}
