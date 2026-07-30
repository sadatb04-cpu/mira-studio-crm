"use client"

import { useState } from "react"
import { format } from "date-fns"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadMoreStockMovements } from "@/app/actions/stock-movements"
import { STOCK_MOVEMENT_TYPE_LABELS } from "@/types/stock-movement"
import type { StockMovementDetail } from "@/types/stock-movement"

interface StockMovementTableProps {
  movements: StockMovementDetail[]
  hasMore: boolean
  /** Exactly one of these identifies which item's ledger to page through. */
  looseDiamondId?: string
  jewelryItemId?: string
}

export function StockMovementTable({ movements: initialMovements, hasMore: initialHasMore, looseDiamondId, jewelryItemId }: StockMovementTableProps) {
  const [movements, setMovements] = useState(initialMovements)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  function handleLoadMore() {
    setIsLoading(true)
    void (async () => {
      const page = await loadMoreStockMovements({ looseDiamondId, jewelryItemId }, movements.length)
      setMovements((current) => [...current, ...page.movements])
      setHasMore(page.hasMore)
      setIsLoading(false)
    })()
  }

  if (movements.length === 0) {
    return <EmptyState title="No stock movements yet" description="Every change to this item's status or quantity will appear here." />
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow className="odd:bg-transparent even:bg-transparent hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="text-muted-foreground">{format(new Date(movement.created_at), "MMM d, yyyy 'at' h:mm a")}</TableCell>
              <TableCell className="text-foreground">{STOCK_MOVEMENT_TYPE_LABELS[movement.movement_type]}</TableCell>
              <TableCell>
                {movement.quantity_delta !== null ? (
                  <span className={movement.quantity_delta >= 0 ? "text-success" : "text-destructive"}>
                    {movement.quantity_delta >= 0 ? "+" : ""}
                    {movement.quantity_delta}
                  </span>
                ) : movement.new_status ? (
                  <span className="text-muted-foreground">
                    {movement.previous_status ?? "—"} → {movement.new_status}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{movement.createdByName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{movement.notes ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasMore && (
        <Button type="button" variant="outline" size="sm" className="w-fit" loading={isLoading} onClick={handleLoadMore}>
          Load More
        </Button>
      )}
    </div>
  )
}
