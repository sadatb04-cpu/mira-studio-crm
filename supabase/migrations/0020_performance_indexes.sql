-- =========================================================================
-- Sprint 2.2 - missing indexes identified during the performance audit.
--
-- Two categories:
-- 1. created_at/due_date indexes for columns that are heavily filtered or
--    sorted by Dashboard/Reports/list pages but never got their own index.
-- 2. pg_trgm GIN indexes for ILIKE search fields where the column is
--    high-cardinality and frequently searched - not every ILIKE field gets
--    one (see the skipped list at the bottom of this file for why).
-- =========================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Date-range / sort columns
-- ---------------------------------------------------------------------

-- Backs getCustomers()/getDashboardCustomers()'s ORDER BY created_at, and
-- getCustomersDashboardStats()'s "new in last 30 days" range filter.
create index customers_created_at_idx on public.customers (created_at);

-- orders.order_date drives getRevenueTrend, getOrdersByStatus, and
-- getDashboardStats' current/previous revenue ranges - every one of them
-- filters by this column, and none of them had an index on it before.
create index orders_order_date_idx on public.orders (order_date);

-- orders.due_date drives getDashboardUpcomingOrders (sort + filter) and the
-- overdue-orders filter used by both the Orders page and Reports.
create index orders_due_date_idx on public.orders (due_date);

-- production_jobs.created_at drives getProductionByStatus's date-range filter.
create index production_jobs_created_at_idx on public.production_jobs (created_at);

-- tasks.due_date drives the due_today/overdue filters (Dashboard's Today's
-- Tasks card, Reports' Overdue Tasks card, the Tasks list page's own filter).
create index tasks_due_date_idx on public.tasks (due_date);

-- tasks.created_at drives getTaskCompletion's date-range filter.
create index tasks_created_at_idx on public.tasks (created_at);

-- Both category tables list-sort by created_at desc; this was previously
-- only indexed alongside other columns, never as its own sort key.
create index loose_diamonds_created_at_idx on public.loose_diamonds (created_at);
create index jewelry_inventory_created_at_idx on public.jewelry_inventory (created_at);

-- Composite indexes for the paginated stock-movement ledger read introduced
-- in Sprint 2.2 (filter by one item id, order by created_at desc, range-
-- paginate) - the existing single-column id indexes support the filter but
-- not the sort, so every page still needed a separate sort step.
create index inventory_stock_movements_loose_diamond_created_idx
  on public.inventory_stock_movements (loose_diamond_id, created_at desc);
create index inventory_stock_movements_jewelry_item_created_idx
  on public.inventory_stock_movements (jewelry_item_id, created_at desc);

-- ---------------------------------------------------------------------
-- Trigram indexes for ILIKE substring search
-- ---------------------------------------------------------------------

-- Customers: searched via .or(full_name.ilike, email.ilike, company_name.ilike)
-- on every Customers list/search request, and reused by Orders' customer-
-- name search (an ilike against this same joined column benefits from the
-- same index regardless of which query initiates the filter).
create index customers_full_name_trgm_idx on public.customers using gin (full_name gin_trgm_ops);
create index customers_email_trgm_idx on public.customers using gin (email gin_trgm_ops);

-- Orders: order_number is the primary search target on the Orders list page.
create index orders_order_number_trgm_idx on public.orders using gin (order_number gin_trgm_ops);

-- Documents: file_name is the primary identifying field searched on the
-- Documents list page.
create index documents_file_name_trgm_idx on public.documents using gin (file_name gin_trgm_ops);

-- Tasks: title is the primary identifying field searched on the Tasks list page.
create index tasks_title_trgm_idx on public.tasks using gin (title gin_trgm_ops);

-- Jewelry: sku and product_name are both searched via .or() on the Jewelry
-- list page, mirroring Loose Diamonds' existing report_number trigram index.
create index jewelry_inventory_sku_trgm_idx on public.jewelry_inventory using gin (sku gin_trgm_ops);
create index jewelry_inventory_product_name_trgm_idx on public.jewelry_inventory using gin (product_name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Deliberately skipped (not "every ILIKE field automatically gets one"):
--
-- - employees.full_name / .position - employee count is bounded by company
--   headcount; a full scan of a table this small is not a measurable cost.
-- - loose_diamonds.shape / .color / .clarity - low-cardinality, effectively
--   categorical values (a handful of distinct shapes/colors/clarities), not
--   the kind of high-cardinality free text trigram indexes are for. The
--   existing plain B-tree indexes already serve their .eq() filter use case.
-- - customers.company_name, documents.description, tasks.description - long
--   or frequently-blank free-text fields included in an .or() as a secondary
--   match, not the primary search target.
-- ---------------------------------------------------------------------
