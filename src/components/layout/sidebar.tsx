import { navigationItems } from "@/config/navigation";
import { NavLink } from "@/components/layout/nav-link";
import type { UserRole } from "@/types/profile";
import type { UserPermissions } from "@/types/permission";

interface SidebarProps {
  role?: UserRole | null;
  permissions?: UserPermissions | null;
  onNavigate?: () => void;
}

export function Sidebar({ role, permissions, onNavigate }: SidebarProps) {
  const items = navigationItems.filter((item) => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    // No View permission for this module -> hidden from the sidebar entirely.
    if (item.permissionModule && permissions && !permissions.modules[item.permissionModule].can_view) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-sm font-semibold tracking-tight">Mira Operations</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}
