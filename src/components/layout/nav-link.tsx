"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/config/navigation";

interface NavLinkProps {
  item: NavigationItem;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ item, onNavigate, collapsed = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  if (item.isEnabled === false) {
    return (
      <span
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40 cursor-not-allowed",
          collapsed && "justify-center px-0"
        )}
        aria-disabled="true"
        title={item.description}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : item.description}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ease-premium",
        "text-sidebar-foreground/80 hover:-translate-y-px hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive &&
          "bg-gradient-to-r from-primary/20 to-brand-secondary/10 text-sidebar-accent-foreground shadow-[0_0_16px_-4px_var(--primary)]",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.badge && !collapsed && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            item.badge.variant === "gold" && "bg-warning/20 text-warning",
            (!item.badge.variant || item.badge.variant === "default") && "bg-primary/10 text-primary",
            item.badge.variant === "secondary" && "bg-secondary text-secondary-foreground",
            item.badge.variant === "outline" && "border border-border text-muted-foreground"
          )}
        >
          {item.badge.text}
        </span>
      )}
    </Link>
  );
}
