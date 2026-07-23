import { cn } from "@/lib/utils"
import { ORDER_STATUS_LABELS, ORDER_WORKFLOW_STAGES, getWorkflowStageIndex } from "@/types/order"
import type { OrderStatus } from "@/types/order"

interface OrderWorkflowStepperProps {
  status: OrderStatus
}

export function OrderWorkflowStepper({ status }: OrderWorkflowStepperProps) {
  if (status === "cancelled") {
    return <p className="text-sm text-destructive">This order has been cancelled.</p>
  }

  const stepIndex = getWorkflowStageIndex(status)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ORDER_WORKFLOW_STAGES.map((stage, index) => (
        <div key={stage} className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              index === stepIndex
                ? "border-primary bg-primary/10 text-primary"
                : index < stepIndex
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-border text-muted-foreground/60"
            )}
          >
            <span>{index + 1}</span>
            <span>{ORDER_STATUS_LABELS[stage]}</span>
          </div>
          {index < ORDER_WORKFLOW_STAGES.length - 1 && <div className="h-px w-4 bg-border" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
