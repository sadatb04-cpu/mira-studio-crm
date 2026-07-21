import { navigationItems } from "@/config/navigation";
import { NavLink } from "@/components/layout/nav-link";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-sm font-semibold tracking-tight">Mira Operations</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => (
          <NavLink key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}
