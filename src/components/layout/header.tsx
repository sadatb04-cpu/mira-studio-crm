"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu className="size-4" />
      </Button>
      <h1 className="text-sm font-semibold text-foreground">{activeItem?.label ?? "Mira Operations"}</h1>

      {profile && (
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{profile.full_name}</span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}
