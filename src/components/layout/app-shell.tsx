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

export function AppShell({ children, profile, permissions }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <PermissionsProvider permissions={permissions}>
      <div className="flex min-h-full flex-1">
        <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:border-r lg:border-sidebar-border">
          <Sidebar role={profile?.role} permissions={permissions} />
        </aside>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-50 h-full w-64 border-r border-sidebar-border">
              <Sidebar role={profile?.role} permissions={permissions} onNavigate={() => setIsMobileNavOpen(false)} />
            </div>
          </div>
        )}

        <div className={cn("flex min-h-full flex-1 flex-col")}>
          <Header onMenuClick={() => setIsMobileNavOpen((open) => !open)} profile={profile} />
          <main className="flex flex-1 flex-col overflow-y-auto bg-background">{children}</main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
