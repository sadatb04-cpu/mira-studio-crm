"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

interface CopyAddressButtonProps {
  addressLines: string[]
}

export function CopyAddressButton({ addressLines }: CopyAddressButtonProps) {
  const hasAddress = addressLines.length > 0

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(addressLines.join("\n"))
      toast.success("Address copied to clipboard.")
    } catch {
      toast.error("Unable to copy address.")
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy} disabled={!hasAddress}>
      <Copy className="size-3.5" data-icon="inline-start" />
      Copy Address
    </Button>
  )
}
