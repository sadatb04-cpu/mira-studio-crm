"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { createProductionJob } from "@/app/actions/production"

interface ReleaseToProductionButtonProps {
  orderId: string
}

export function ReleaseToProductionButton({ orderId }: ReleaseToProductionButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createProductionJob(orderId)
      // On success the action redirects server-side and this line is never
      // reached; on failure it returns here instead, so we stay on this
      // page and surface the error rather than silently discarding it.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="sm" onClick={handleClick} disabled={isPending} className="self-start">
        {isPending ? "Releasing..." : "Release to Production"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
