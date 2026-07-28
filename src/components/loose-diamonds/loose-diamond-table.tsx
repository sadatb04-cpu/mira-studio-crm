"use client"

import { Diamond } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LooseDiamondStatusBadge } from "@/components/loose-diamonds/loose-diamond-status-badge"
import type { LooseDiamondListItem } from "@/types/loose-diamond"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface LooseDiamondTableProps {
  diamonds: LooseDiamondListItem[]
}

export function LooseDiamondTable({ diamonds }: LooseDiamondTableProps) {
  const router = useRouter()

  if (diamonds.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Diamond} title="No loose diamonds found" description="Try adjusting your search or filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Report #</TableHead>
            <TableHead>Shape</TableHead>
            <TableHead className="text-right">Carat</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>Clarity</TableHead>
            <TableHead>Growth Type</TableHead>
            <TableHead className="text-right">Cost (USD)</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {diamonds.map((diamond) => (
            <TableRow key={diamond.id} onClick={() => router.push(`/inventory/diamonds/${diamond.id}`)} className="cursor-pointer">
              <TableCell className="font-medium text-foreground">
                <Link
                  href={`/inventory/diamonds/${diamond.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:underline"
                >
                  {diamond.report_number}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{diamond.shape ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{diamond.carat.toFixed(2)}</TableCell>
              <TableCell className="text-muted-foreground">{diamond.color ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{diamond.clarity ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{diamond.growth_type ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatCurrency(diamond.cost_usd)}</TableCell>
              <TableCell className="text-right font-medium text-foreground">{formatCurrency(diamond.selling_price)}</TableCell>
              <TableCell>
                <LooseDiamondStatusBadge status={diamond.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
