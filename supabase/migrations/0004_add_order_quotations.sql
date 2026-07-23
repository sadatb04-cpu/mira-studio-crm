-- =========================================================================
-- Sprint 4.1.3: Sales Review & Multi-Quotation System
-- Adds order_quotations - an order can have unlimited pricing quotations,
-- each with its own cost breakdown and a generated grand_total. Only one
-- quotation per order may be "accepted" at a time (enforced by a partial
-- unique index, not just application logic). orders.subtotal/total are kept
-- in sync with the accepted quotation's grand_total (see
-- syncOrderTotalFromAcceptedQuotation() in src/lib/supabase/quotations.ts)
-- so existing Reports/Dashboard/Customer-lifetime-value queries - which all
-- read orders.total - keep working unchanged.
-- =========================================================================

create type public.quotation_status as enum (
  'draft',
  'sent',
  'accepted',
  'rejected'
);

create table public.order_quotations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  quote_name text not null,
  status public.quotation_status not null default 'draft',
  metal_cost numeric(12, 2) not null default 0,
  stone_cost numeric(12, 2) not null default 0,
  labor_cost numeric(12, 2) not null default 0,
  cad_cost numeric(12, 2) not null default 0,
  setting_cost numeric(12, 2) not null default 0,
  certification_cost numeric(12, 2) not null default 0,
  hallmark_cost numeric(12, 2) not null default 0,
  packaging_cost numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  other_charges numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) generated always as (
    metal_cost + stone_cost + labor_cost + cad_cost + setting_cost +
    certification_cost + hallmark_cost + packaging_cost + shipping_cost +
    other_charges - discount
  ) stored,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_quotations_order_id_idx on public.order_quotations (order_id);

-- Hard DB-level guarantee alongside the application's own "flip the
-- previous accepted quotation to sent first" logic - two accepted rows for
-- the same order can never exist, even under a race or an app-layer bug.
create unique index order_quotations_one_accepted_per_order
  on public.order_quotations (order_id)
  where (status = 'accepted');

create trigger order_quotations_set_updated_at
  before update on public.order_quotations
  for each row
  execute function public.set_updated_at();

alter table public.order_quotations enable row level security;

-- Matches the existing "operational table" policy shape used for orders/
-- order_items/order_stones/order_files: any authenticated staff member can
-- read and manage.
create policy "Authenticated users can manage order quotations"
  on public.order_quotations for all
  to authenticated
  using (true)
  with check (true);
