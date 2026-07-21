"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:border-r lg:border-sidebar-border">
        <Sidebar />
      </aside>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full w-64 border-r border-sidebar-border">
            <Sidebar onNavigate={() => setIsMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("flex min-h-full flex-1 flex-col")}>
        <Header onMenuClick={() => setIsMobileNavOpen((open) => !open)} />
        <main className="flex flex-1 flex-col overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
