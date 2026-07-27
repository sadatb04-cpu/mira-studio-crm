"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import type { Profile } from "@/types/profile";
import type { UserPermissions } from "@/types/permission";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  permissions: UserPermissions | null;
}

const SIDEBAR_COLLAPSE_KEY = "mira-sidebar-collapsed";

export function AppShell({ children, profile, permissions }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1"
  );

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <PermissionsProvider permissions={permissions}>
      <div className="flex min-h-full flex-1 gap-3 bg-transparent p-3">
        <aside
          className={cn(
            "glass-sidebar hidden shrink-0 rounded-2xl transition-all duration-200 ease-premium lg:block",
            collapsed ? "lg:w-[72px]" : "lg:w-64"
          )}
        >
          <Sidebar role={profile?.role} permissions={permissions} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </aside>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div className="glass-sidebar relative z-50 h-full w-64 rounded-r-2xl">
              <Sidebar role={profile?.role} permissions={permissions} onNavigate={() => setIsMobileNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="glass-surface flex min-h-full flex-1 flex-col overflow-hidden rounded-2xl">
          <Header onMenuClick={() => setIsMobileNavOpen((open) => !open)} profile={profile} />
          <main className="flex flex-1 flex-col overflow-y-auto bg-transparent">{children}</main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
