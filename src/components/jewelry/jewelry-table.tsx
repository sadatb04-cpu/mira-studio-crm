"use client"

import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { JewelryStatusBadge } from "@/components/jewelry/jewelry-status-badge"
import { JewelryStockLevelBadge } from "@/components/jewelry/jewelry-stock-level-badge"
import type { JewelryListItem } from "@/types/jewelry"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface JewelryTableProps {
  items: JewelryListItem[]
}

export function JewelryTable({ items }: JewelryTableProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon={Sparkles} title="No jewelry items found" description="Try adjusting your search or filters." />
      </SectionCard>
    )
  }

  return (
    <SectionCard contentClassName="px-0">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Metal</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stock Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} onClick={() => router.push(`/inventory/jewelry/${item.id}`)} className="cursor-pointer">
              <TableCell className="font-medium text-foreground">
                <Link href={`/inventory/jewelry/${item.id}`} onClick={(event) => event.stopPropagation()} className="hover:underline">
                  {item.product_name}
                </Link>
                <div className="text-xs text-muted-foreground">{item.sku}</div>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.category ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{item.metal ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{item.quantity}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatCurrency(item.cost)}</TableCell>
              <TableCell className="text-right font-medium text-foreground">{formatCurrency(item.selling_price)}</TableCell>
              <TableCell>
                <JewelryStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <JewelryStockLevelBadge quantity={item.quantity} reorderLevel={item.reorder_level} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
