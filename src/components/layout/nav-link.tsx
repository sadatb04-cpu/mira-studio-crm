"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/config/navigation";

interface NavLinkProps {
  item: NavigationItem;
  onNavigate?: () => void;
}

export function NavLink({ item, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  if (item.isEnabled === false) {
    return (
      <span
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40 cursor-not-allowed"
        aria-disabled="true"
        title={item.description}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.description}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            item.badge.variant === "gold" && "bg-amber-400/20 text-amber-600 dark:text-amber-400",
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
