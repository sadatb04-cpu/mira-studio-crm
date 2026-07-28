"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionCard } from "@/components/shared/section-card"
import { assignTask } from "@/app/actions/tasks"
import type { EmployeeOption } from "@/types/production"

interface TaskAssignmentCardProps {
  taskId: string
  employees: EmployeeOption[]
  assignedEmployeeId: string | null
}

export function TaskAssignmentCard({ taskId, employees, assignedEmployeeId }: TaskAssignmentCardProps) {
  const router = useRouter()
  const [selected, setSelected] = useState(assignedEmployeeId ?? "unassigned")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAssign() {
    setError(null)
    startTransition(async () => {
      const result = await assignTask(taskId, selected === "unassigned" ? "" : selected)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <SectionCard title="Assigned Employee">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assigned-employee">Employee</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="assigned-employee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="button"
          size="sm"
          onClick={handleAssign}
          disabled={isPending || selected === (assignedEmployeeId ?? "unassigned")}
          className="self-start"
        >
          {isPending ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </SectionCard>
  )
}
