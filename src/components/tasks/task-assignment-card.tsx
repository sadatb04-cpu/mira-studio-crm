"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/shared/section-card"
import { assignTask } from "@/app/actions/tasks"
import type { EmployeeOption } from "@/types/production"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-input backdrop-blur-sm px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

interface TaskAssignmentCardProps {
  taskId: string
  employees: EmployeeOption[]
  assignedEmployeeId: string | null
}

export function TaskAssignmentCard({ taskId, employees, assignedEmployeeId }: TaskAssignmentCardProps) {
  const router = useRouter()
  const [selected, setSelected] = useState(assignedEmployeeId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAssign() {
    setError(null)
    startTransition(async () => {
      const result = await assignTask(taskId, selected)
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
          <select
            id="assigned-employee"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={selectClassName}
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="button"
          size="sm"
          onClick={handleAssign}
          disabled={isPending || selected === (assignedEmployeeId ?? "")}
          className="self-start"
        >
          {isPending ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </SectionCard>
  )
}
