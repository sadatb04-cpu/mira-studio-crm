"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { applyRoleTemplate, updateModulePermissions, updateSpecialPermissions } from "@/app/actions/permissions"
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  ROLE_TEMPLATES,
  SPECIAL_PERMISSIONS,
  SPECIAL_PERMISSION_LABELS,
} from "@/types/permission"
import type { ModulePermission, PermissionModule, SpecialPermission, UserPermissions } from "@/types/permission"

interface PermissionsDrawerProps {
  userId: string
  userName: string
  isAdmin: boolean
  permissions: UserPermissions
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PermissionsDrawer({ userId, userName, isAdmin, permissions, open, onOpenChange }: PermissionsDrawerProps) {
  const router = useRouter()
  const [modules, setModules] = useState(permissions.modules)
  const [special, setSpecial] = useState(permissions.special)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleModule(module: PermissionModule, field: keyof ModulePermission) {
    setModules((current) => ({ ...current, [module]: { ...current[module], [field]: !current[module][field] } }))
  }

  function toggleSpecial(key: SpecialPermission) {
    setSpecial((current) => ({ ...current, [key]: !current[key] }))
  }

  function handleApplyTemplate(templateKey: string) {
    setError(null)
    startTransition(async () => {
      const result = await applyRoleTemplate(userId, templateKey)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const moduleResult = await updateModulePermissions(userId, modules)
      if (moduleResult.error) {
        setError(moduleResult.error)
        return
      }

      const specialResult = await updateSpecialPermissions(userId, special)
      if (specialResult.error) {
        setError(specialResult.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Permissions - {userName}</SheetTitle>
          <SheetDescription>
            {isAdmin
              ? "Admins always have full access - permissions here have no effect while the role stays Admin."
              : "Roles are just defaults. These settings determine actual access."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Role Templates</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_TEMPLATES.map((template) => (
                <Button
                  key={template.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending || isAdmin}
                  onClick={() => handleApplyTemplate(template.key)}
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Modules</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Module</th>
                    <th className="px-3 py-2 text-center">View</th>
                    <th className="px-3 py-2 text-center">Create</th>
                    <th className="px-3 py-2 text-center">Edit</th>
                    <th className="px-3 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((module) => (
                    <tr key={module} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{PERMISSION_MODULE_LABELS[module]}</td>
                      {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((field) => (
                        <td key={field} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isAdmin || modules[module][field]}
                            disabled={isAdmin}
                            onChange={() => toggleModule(module, field)}
                            className="size-4 rounded border-input accent-primary"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Special Permissions</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SPECIAL_PERMISSIONS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={isAdmin || special[key]}
                    disabled={isAdmin}
                    onChange={() => toggleSpecial(key)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  {SPECIAL_PERMISSION_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending || isAdmin}>
            {isPending && <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
