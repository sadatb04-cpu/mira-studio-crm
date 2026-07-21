"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { navigationItems } from "@/config/navigation";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
    </header>
  );
}
