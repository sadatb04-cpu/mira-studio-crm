import { notFound } from "next/navigation"

// This route predates the category-based inventory redesign (see migration
// 0017) - items now live at /inventory/diamonds/:id and /inventory/jewelry/:id.
// The table this page used to query (inventory_items) is permanently empty
// post-redesign, so this already 404's for every id; it just does so
// without the now-pointless query.
export default function InventoryItemPage() {
  notFound()
}
