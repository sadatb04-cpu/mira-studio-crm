"use server"

import { createClient } from "@/lib/supabase/server"
import { getStockMovements, STOCK_MOVEMENTS_PAGE_SIZE } from "@/lib/supabase/inventory-shared"
import type { StockMovementsPage } from "@/lib/supabase/inventory-shared"

// Backs the "Load More" button in StockMovementTable, shared by both the
// Loose Diamonds and Jewelry detail pages - the initial page of history is
// fetched server-side by the page itself; this only runs when the user asks
// for more, so a long-lived item's full ledger is never loaded up front.
export async function loadMoreStockMovements(
  filter: { looseDiamondId?: string; jewelryItemId?: string },
  offset: number
): Promise<StockMovementsPage> {
  const supabase = await createClient()
  return getStockMovements(supabase, { ...filter, offset, limit: STOCK_MOVEMENTS_PAGE_SIZE })
}
