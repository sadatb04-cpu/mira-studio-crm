"use client";

import { Bell, ChevronRight, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserMenu } from "@/components/layout/user-menu";
import { CommandSearch } from "@/components/layout/command-search";
import { navigationItems } from "@/config/navigation";
import type { Profile } from "@/types/profile";

interface HeaderProps {
  onMenuClick: () => void;
  profile: Profile | null;
}

export function Header({ onMenuClick, profile }: HeaderProps) {
  const pathname = usePathname();
  const activeItem = navigationItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 rounded-t-2xl border-b border-border/70 bg-transparent px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground">
          <Home className="size-3.5" />
        </Link>
        {activeItem && activeItem.href !== "/" && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            <span className="truncate font-semibold text-foreground">{activeItem.label}</span>
          </>
        )}
        {(!activeItem || activeItem.href === "/") && (
          <span className="truncate font-semibold text-foreground">Dashboard</span>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <CommandSearch role={profile?.role} />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                <Bell className="size-4 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">No new notifications right now.</p>
            </div>
          </PopoverContent>
        </Popover>

        {profile && <UserMenu profile={profile} />}
      </div>
    </header>
  );
}
