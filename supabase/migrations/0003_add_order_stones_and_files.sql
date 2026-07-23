-- =========================================================================
-- Sprint 4.1.1: Orders Enhancement (Multi-Stone + Attachments)
-- Adds order_stones (many stones per order, decoupled from order_items -
-- replaces the old single stone_type/stone_shape/stone_size fields embedded
-- in order_items.specifications) and order_files (reference images/files
-- per order, reusing the existing `documents` Storage bucket - this table
-- only stores metadata, no new bucket).
-- =========================================================================

create type public.stone_type as enum (
  'lab_diamond',
  'natural_diamond',
  'emerald',
  'ruby',
  'sapphire',
  'moissanite',
  'pearl',
  'other'
);

create type public.stone_shape as enum (
  'round',
  'oval',
  'princess',
  'cushion',
  'emerald',
  'pear',
  'marquise',
  'radiant',
  'asscher',
  'heart',
  'trillion',
  'baguette',
  'old_mine',
  'old_european',
  'other'
);

create table public.order_stones (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  stone_type public.stone_type not null,
  shape public.stone_shape not null,
  quantity integer not null default 1 check (quantity > 0),
  mm_size text not null,
  carat_weight numeric(10, 3) not null check (carat_weight > 0),
  color text,
  clarity text,
  notes text,
  created_at timestamptz not null default now()
);

create index order_stones_order_id_idx on public.order_stones (order_id);

create table public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  file_size bigint not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_files_order_id_idx on public.order_files (order_id);

alter table public.order_stones enable row level security;
alter table public.order_files enable row level security;

-- Matches the existing "operational table" policy shape used for orders/
-- order_items: any authenticated staff member can read and manage.
create policy "Authenticated users can manage order stones"
  on public.order_stones for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage order files"
  on public.order_files for all
  to authenticated
  using (true)
  with check (true);
