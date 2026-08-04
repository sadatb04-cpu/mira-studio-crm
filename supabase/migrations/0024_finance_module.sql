-- =========================================================================
-- Finance module - three simple sections: Manufacturing (manufacturers ->
-- invoices), Sellers (sellers -> invoices, with an auto-computed profit),
-- and Company Expenses (a flat log, not related to manufacturing/sellers).
--
-- Mirrors the Documents module's folder -> document nesting for
-- Manufacturing/Sellers (dedicated parent tables, ON DELETE CASCADE to
-- their invoices - unlike document_folders' SET NULL, an invoice has no
-- meaning without its manufacturer/seller) and the Documents table's own
-- file columns (file_name/file_size/mime_type/file_url, where file_url
-- actually stores a Storage *path*, not a URL - kept for consistency with
-- that existing convention). All three invoice/expense tables additionally
-- carry a nullable google_sheet_url as an alternative to an uploaded file,
-- per the module spec (link OR file, not both required).
--
-- Files are stored in the existing "documents" Storage bucket (created
-- out-of-band, not via migration - see documents.ts) rather than a new
-- bucket, exactly like every other per-record attachment in this app.
-- =========================================================================

alter type public.permission_module add value 'finance';

alter type public.activity_entity_type add value 'finance_manufacturer';
alter type public.activity_entity_type add value 'finance_seller';
alter type public.activity_entity_type add value 'finance_manufacturer_invoice';
alter type public.activity_entity_type add value 'finance_seller_invoice';
alter type public.activity_entity_type add value 'finance_expense';

create type public.finance_expense_category as enum (
  'salaries',
  'office_rent',
  'internet',
  'electricity',
  'marketing',
  'software',
  'shipping',
  'miscellaneous'
);

-- ---------------------------------------------------------------------
-- Section 1: Manufacturing
-- ---------------------------------------------------------------------

create table public.finance_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger finance_manufacturers_set_updated_at
  before update on public.finance_manufacturers
  for each row
  execute function public.set_updated_at();

create table public.finance_manufacturer_invoices (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.finance_manufacturers (id) on delete cascade,
  product_type text not null,
  manufacturing_price numeric(12, 2) not null check (manufacturing_price >= 0),
  invoice_date date not null,
  notes text,
  file_name text,
  file_size bigint,
  mime_type text,
  file_url text,
  google_sheet_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_manufacturer_invoices_attachment_chk check (file_url is not null or google_sheet_url is not null)
);

create trigger finance_manufacturer_invoices_set_updated_at
  before update on public.finance_manufacturer_invoices
  for each row
  execute function public.set_updated_at();

-- Composite (parent id, date desc) index for the per-manufacturer invoice
-- ledger's paginated "Load More" query - same shape as Sprint 2.2's
-- inventory_stock_movements indexes.
create index finance_manufacturer_invoices_manufacturer_date_idx
  on public.finance_manufacturer_invoices (manufacturer_id, invoice_date desc);
create index finance_manufacturer_invoices_invoice_date_idx on public.finance_manufacturer_invoices (invoice_date);

-- ---------------------------------------------------------------------
-- Section 2: Sellers
-- ---------------------------------------------------------------------

create table public.finance_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger finance_sellers_set_updated_at
  before update on public.finance_sellers
  for each row
  execute function public.set_updated_at();

create table public.finance_seller_invoices (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.finance_sellers (id) on delete cascade,
  product_name text not null,
  manufacturing_price numeric(12, 2) not null check (manufacturing_price >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  -- Never independently writable, by design (see module spec: "Profit must
  -- NEVER be entered manually") - a GENERATED column makes this the
  -- database's guarantee rather than the application's, exactly like
  -- loose_diamonds.selling_price (0021).
  profit numeric(12, 2) generated always as (selling_price - manufacturing_price) stored,
  invoice_date date not null,
  file_name text,
  file_size bigint,
  mime_type text,
  file_url text,
  google_sheet_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_seller_invoices_attachment_chk check (file_url is not null or google_sheet_url is not null)
);

create trigger finance_seller_invoices_set_updated_at
  before update on public.finance_seller_invoices
  for each row
  execute function public.set_updated_at();

create index finance_seller_invoices_seller_date_idx
  on public.finance_seller_invoices (seller_id, invoice_date desc);
create index finance_seller_invoices_invoice_date_idx on public.finance_seller_invoices (invoice_date);

-- ---------------------------------------------------------------------
-- Section 3: Company Expenses (flat log - no manufacturer/seller relation)
-- ---------------------------------------------------------------------

create table public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  category public.finance_expense_category not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null,
  notes text,
  file_name text,
  file_size bigint,
  mime_type text,
  file_url text,
  google_sheet_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_expenses_attachment_chk check (file_url is not null or google_sheet_url is not null)
);

create trigger finance_expenses_set_updated_at
  before update on public.finance_expenses
  for each row
  execute function public.set_updated_at();

create index finance_expenses_category_idx on public.finance_expenses (category);
create index finance_expenses_expense_date_idx on public.finance_expenses (expense_date desc);

-- ---------------------------------------------------------------------
-- Search indexes - Manufacturer/Seller name and Product Type/Name are
-- explicit top-level Search requirements in the module spec, so (unlike
-- e.g. employees.full_name) these get trigram indexes from day one rather
-- than waiting for a follow-up performance audit.
-- ---------------------------------------------------------------------

create index finance_manufacturers_name_trgm_idx on public.finance_manufacturers using gin (name gin_trgm_ops);
create index finance_sellers_name_trgm_idx on public.finance_sellers using gin (name gin_trgm_ops);
create index finance_manufacturer_invoices_product_type_trgm_idx
  on public.finance_manufacturer_invoices using gin (product_type gin_trgm_ops);
create index finance_seller_invoices_product_name_trgm_idx
  on public.finance_seller_invoices using gin (product_name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- RLS - authenticated-only, matching every other operational table in this
-- app (module-level view/create/edit/delete gating happens in the
-- application layer via requireModulePermission, not RLS - see
-- src/lib/supabase/permissions.ts).
-- ---------------------------------------------------------------------

alter table public.finance_manufacturers enable row level security;
alter table public.finance_manufacturer_invoices enable row level security;
alter table public.finance_sellers enable row level security;
alter table public.finance_seller_invoices enable row level security;
alter table public.finance_expenses enable row level security;

create policy "Authenticated users can manage finance manufacturers"
  on public.finance_manufacturers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage finance manufacturer invoices"
  on public.finance_manufacturer_invoices for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage finance sellers"
  on public.finance_sellers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage finance seller invoices"
  on public.finance_seller_invoices for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage finance expenses"
  on public.finance_expenses for all
  to authenticated
  using (true)
  with check (true);

-- No user_permissions seeding: getUserPermissions() grants admins full
-- access to every PERMISSION_MODULES entry at runtime (not from stored
-- rows), and every non-admin ROLE_TEMPLATE deliberately omits 'finance' -
-- this is a brand-new, financially-sensitive module, so non-admins default
-- to no access until an admin explicitly grants it from Settings -> User
-- Access, rather than being seeded into any existing role template.
