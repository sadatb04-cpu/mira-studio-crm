-- =========================================================================
-- Inventory Module Redesign: category-driven inventory management for a
-- jewelry manufacturer, replacing the single flat inventory_items table's
-- one-size-fits-all schema with dedicated, properly-typed tables per
-- category. Starts with the two categories that matter today (Loose
-- Diamonds, Jewelry); adding a new category later means adding a new
-- table + config, not touching this migration or its siblings.
--
-- The old inventory_items / inventory_category enum / inventory_transactions
-- / inventory_import_batches (pre-existing columns) are left fully in
-- place, untouched, dormant - a live-data check confirmed inventory_items
-- has 0 rows and 0 references from order_items/documents, so there is no
-- migration risk, but dropping it would buy nothing while risking breaking
-- src/lib/supabase/dashboard.ts and reports.ts, which still read it.
-- =========================================================================

-- =========================================================================
-- Loose Diamonds
-- =========================================================================

create type public.loose_diamond_status as enum ('available', 'reserved', 'sold', 'on_memo');

create table public.loose_diamonds (
  id uuid primary key default gen_random_uuid(),
  report_number text not null,
  lab text,
  shape text,
  carat numeric(8, 3) not null,
  color text,
  clarity text,
  cut text,
  polish text,
  symmetry text,
  fluorescence text,
  -- Free text rather than an enum: "Natural" / "Lab Grown - CVD" / "Lab
  -- Grown - HPHT" are the UI's suggested values, but lab report wording
  -- varies enough (and bulk-import data is messy enough) that a strict
  -- enum would reject otherwise-valid rows.
  growth_type text,
  country_of_origin text,
  cost_usd numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  status public.loose_diamond_status not null default 'available',
  supplier_id uuid references public.suppliers (id) on delete set null,
  date_added date not null default current_date,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Report Number is the natural unique key (comes from the grading lab, not
-- generated) - case-insensitive since data entry/import sources vary.
create unique index loose_diamonds_report_number_idx on public.loose_diamonds (lower(report_number));
create index loose_diamonds_status_idx on public.loose_diamonds (status);
create index loose_diamonds_supplier_id_idx on public.loose_diamonds (supplier_id);
create index loose_diamonds_shape_idx on public.loose_diamonds (shape);
create index loose_diamonds_is_active_idx on public.loose_diamonds (is_active);

-- pg_trgm + a GIN index is what makes ilike '%...%' substring search on
-- Report Number genuinely fast at scale, not just prefix search - the
-- brief explicitly calls out instant search here.
create extension if not exists pg_trgm;
create index loose_diamonds_report_number_trgm_idx on public.loose_diamonds using gin (report_number gin_trgm_ops);

create trigger loose_diamonds_set_updated_at
  before update on public.loose_diamonds
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Jewelry
-- =========================================================================

create table public.jewelry_inventory (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null,
  -- Fixed dropdown in the UI (Ring/Necklace/Earrings/Bracelet/Pendant/
  -- Bangle/Chain/Set/Other) but stored as text rather than an enum so
  -- adding a new jewelry type doesn't require a migration.
  category text,
  metal text,
  metal_purity text,
  diamond_type text,
  diamond_weight numeric(8, 3),
  gross_weight numeric(10, 3),
  net_weight numeric(10, 3),
  cost numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  -- Trigger-maintained via inventory_stock_movements below - never written
  -- directly by application code, same discipline as the old system's
  -- quantity_on_hand.
  quantity numeric(12, 3) not null default 0,
  reorder_level numeric(12, 3) not null default 1,
  -- Manual business status (active/reserved/sold/discontinued), separate
  -- from the derived Low Stock/Out of Stock read purely off quantity vs
  -- reorder_level - a piece can be "reserved" for a customer regardless of
  -- how much matching stock remains.
  status text not null default 'active',
  location text,
  notes text,
  is_active boolean not null default true,
  supplier_id uuid references public.suppliers (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index jewelry_inventory_sku_idx on public.jewelry_inventory (lower(sku));
create index jewelry_inventory_category_idx on public.jewelry_inventory (category);
create index jewelry_inventory_status_idx on public.jewelry_inventory (status);
create index jewelry_inventory_is_active_idx on public.jewelry_inventory (is_active);
create index jewelry_inventory_supplier_id_idx on public.jewelry_inventory (supplier_id);

create trigger jewelry_inventory_set_updated_at
  before update on public.jewelry_inventory
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Documents linkage - images/certificates reuse the existing Documents +
-- Storage module rather than a parallel attachment system, mirroring the
-- pre-existing documents.inventory_item_id pattern.
-- =========================================================================

alter table public.documents
  add column loose_diamond_id uuid references public.loose_diamonds (id) on delete set null,
  add column jewelry_item_id uuid references public.jewelry_inventory (id) on delete set null;

create index documents_loose_diamond_id_idx on public.documents (loose_diamond_id);
create index documents_jewelry_item_id_idx on public.documents (jewelry_item_id);

-- =========================================================================
-- Import batch log - generalized with a category discriminator rather than
-- forked per category, so a brand-new category never needs its own
-- migration just to log imports.
-- =========================================================================

alter table public.inventory_import_batches
  add column category text not null default 'legacy';

-- =========================================================================
-- Activity log entity types - the existing logActivity() pattern (see
-- src/lib/supabase/inventory.ts) needs new entity_type values to describe
-- events on the new tables.
-- =========================================================================

alter type public.activity_entity_type add value if not exists 'loose_diamond';
alter type public.activity_entity_type add value if not exists 'jewelry_item';

-- =========================================================================
-- Stock movement ledger - a foundational ERP component shared across both
-- categories (and extensible to future ones: add one nullable FK column +
-- widen the check constraint). Every quantity change and status transition
-- goes through here rather than being written directly, exactly like the
-- old inventory_transactions/quantity_on_hand discipline, generalized to
-- also cover status (which the old system never tracked as history).
-- =========================================================================

create type public.stock_movement_type as enum (
  'purchase', 'sale', 'production_use', 'adjustment', 'return', 'status_change', 'initial'
);

create table public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  loose_diamond_id uuid references public.loose_diamonds (id) on delete cascade,
  jewelry_item_id uuid references public.jewelry_inventory (id) on delete cascade,
  movement_type public.stock_movement_type not null,
  -- Null/unused for loose diamonds - each row is one unique stone, not a
  -- quantity of stock.
  quantity_delta numeric(12, 3),
  previous_status text,
  new_status text,
  -- Reuses the existing polymorphic reference_type enum from the old
  -- inventory_transactions table (order/production_job/purchase/
  -- adjustment/manual) rather than inventing a parallel one.
  reference_type public.inventory_reference_type,
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_stock_movements_one_target check (
    (loose_diamond_id is not null)::int + (jewelry_item_id is not null)::int = 1
  )
);

create index inventory_stock_movements_loose_diamond_idx on public.inventory_stock_movements (loose_diamond_id);
create index inventory_stock_movements_jewelry_item_idx on public.inventory_stock_movements (jewelry_item_id);
create index inventory_stock_movements_type_idx on public.inventory_stock_movements (movement_type);

-- One trigger serves both categories: applies a quantity delta when
-- present (jewelry only), and/or writes a new status onto the target row
-- when a status_change movement carries one (either category) - so the
-- ledger is always the single source of truth and the visible row can
-- never drift from its own history.
create or replace function public.apply_inventory_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.jewelry_item_id is not null and new.quantity_delta is not null then
    update jewelry_inventory
    set quantity = quantity + new.quantity_delta
    where id = new.jewelry_item_id;
  end if;

  if new.new_status is not null then
    if new.loose_diamond_id is not null then
      update loose_diamonds
      set status = new.new_status::loose_diamond_status
      where id = new.loose_diamond_id;
    elsif new.jewelry_item_id is not null then
      update jewelry_inventory
      set status = new.new_status
      where id = new.jewelry_item_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_stock_movements_apply
  after insert on public.inventory_stock_movements
  for each row
  execute function public.apply_inventory_stock_movement();

-- =========================================================================
-- RLS - same blanket "any authenticated staff member" pattern used by every
-- other operational table in this app (module-level gating happens in the
-- app layer via requireModulePermission, not here). The ledger itself is
-- append-only: select + insert policies only, no update/delete policy at
-- all, matching the old inventory_transactions/inventory_import_batches
-- pattern.
-- =========================================================================

alter table public.loose_diamonds enable row level security;
alter table public.jewelry_inventory enable row level security;
alter table public.inventory_stock_movements enable row level security;

create policy "Authenticated users can manage loose diamonds"
  on public.loose_diamonds for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage jewelry inventory"
  on public.jewelry_inventory for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can view stock movements"
  on public.inventory_stock_movements for select
  to authenticated
  using (true);

create policy "Authenticated users can record stock movements"
  on public.inventory_stock_movements for insert
  to authenticated
  with check (true);
