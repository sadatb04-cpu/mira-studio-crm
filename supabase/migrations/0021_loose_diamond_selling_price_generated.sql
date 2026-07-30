-- =========================================================================
-- Fix Loose Diamonds pricing: selling_price must always be cost_usd * 1.15.
--
-- selling_price was previously an independently stored/editable column -
-- manual entry and, more commonly, mismapped bulk-import columns (the
-- "Selling Price" alias list included generic headers like "price", which
-- could collide with a cost-price column in some source spreadsheets) left
-- many rows with a selling_price that didn't reflect the intended 15%
-- markup, and in some cases equal to (or swapped with) cost_usd.
--
-- Converting it to a GENERATED column makes this the database's problem to
-- guarantee, not the application's: Postgres recomputes it from cost_usd
-- for every existing row the moment this migration runs (fixing all
-- historical bad data in one shot), and rejects any future INSERT/UPDATE
-- that tries to write to it directly - the bug class this fixes cannot
-- recur through the app, an import, or a stray manual SQL update.
--
-- cost_usd itself is untouched - this migration only ever reads it.
-- =========================================================================

alter table public.loose_diamonds drop column selling_price;

alter table public.loose_diamonds
  add column selling_price numeric(12, 2) generated always as (cost_usd * 1.15) stored;
