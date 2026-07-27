"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { navigationItems } from "@/config/navigation";
import { usePermissions } from "@/components/providers/permissions-provider";
import type { UserRole } from "@/types/profile";

interface CommandSearchProps {
  role?: UserRole | null;
}

export function CommandSearch({ role }: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const permissions = usePermissions();

  const items = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.isEnabled === false) return false;
        if (item.roles && (!role || !item.roles.includes(role))) return false;
        if (item.permissionModule && permissions && !permissions.modules[item.permissionModule].can_view) return false;
        return true;
      }),
    [permissions, role]
  );

  const results = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden w-56 justify-start gap-2 text-muted-foreground sm:flex"
      >
        <Search className="size-3.5" data-icon="inline-start" />
        Search...
        <kbd className="ml-auto rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} className="sm:hidden" aria-label="Search">
        <Search className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to a page..."
              className="h-auto border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching pages.</p>
            ) : (
              results.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ease-premium hover:bg-muted"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
