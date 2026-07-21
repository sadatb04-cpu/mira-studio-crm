-- =========================================================================
-- CRM domain schema for a custom jewelry manufacturer.
-- Builds on 0001_create_profiles.sql (profiles, user_role, department,
-- set_updated_at(), current_user_role()).
-- =========================================================================

-- =========================================================================
-- Enums
-- =========================================================================

create type public.employment_status as enum (
  'active',
  'on_leave',
  'terminated'
);

create type public.order_status as enum (
  'draft',
  'confirmed',
  'in_production',
  'ready_for_delivery',
  'delivered',
  'completed',
  'cancelled'
);

create type public.production_job_status as enum (
  'queued',
  'in_progress',
  'quality_check',
  'rework',
  'completed',
  'on_hold',
  'cancelled'
);

create type public.production_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create type public.production_stage_name as enum (
  'design',
  'wax_carving',
  'casting',
  'stone_setting',
  'polishing',
  'quality_check',
  'engraving',
  'packaging',
  'shipping'
);

create type public.production_stage_status as enum (
  'pending',
  'in_progress',
  'completed',
  'skipped'
);

create type public.task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type public.task_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.inventory_category as enum (
  'gold',
  'lab_diamond',
  'natural_diamond',
  'gemstone',
  'finding',
  'packaging',
  'consumable',
  'finished_jewelry'
);

create type public.inventory_transaction_type as enum (
  'purchase',
  'allocation',
  'production_use',
  'adjustment',
  'return',
  'finished_goods',
  'sale'
);

create type public.inventory_reference_type as enum (
  'order',
  'production_job',
  'purchase',
  'adjustment',
  'manual'
);

create type public.document_type as enum (
  'invoice',
  'igi_certificate',
  'cad_file',
  'image',
  'shipping_label',
  'other'
);

create type public.activity_entity_type as enum (
  'profile',
  'employee',
  'customer',
  'order',
  'order_item',
  'production_job',
  'production_stage',
  'task',
  'inventory_item',
  'inventory_transaction',
  'supplier',
  'storage_location',
  'document',
  'notification',
  'setting'
);

create type public.notification_type as enum (
  'task_assigned',
  'order_status_changed',
  'production_stage_completed',
  'low_stock',
  'document_uploaded',
  'system'
);

-- =========================================================================
-- Employees (extends profiles with HR-only fields, 1:1)
-- =========================================================================

create table public.employees (
  id uuid primary key references public.profiles (id) on delete cascade,
  position text,
  hire_date date,
  employment_status public.employment_status not null default 'active',
  termination_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_employment_status_idx on public.employees (employment_status);

create trigger employees_set_updated_at
  before update on public.employees
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Customers
-- =========================================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_email_idx on public.customers (email);
create index customers_full_name_idx on public.customers (full_name);

create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Suppliers & storage locations
-- =========================================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  contact_person text,
  email text,
  phone text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger storage_locations_set_updated_at
  before update on public.storage_locations
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Inventory items
-- =========================================================================

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category public.inventory_category not null,
  subcategory text,
  unit text not null,
  -- Maintained by apply_inventory_transaction() from inventory_transactions;
  -- do not update this column directly outside that trigger.
  quantity_on_hand numeric(14, 3) not null default 0,
  minimum_stock numeric(14, 3) not null default 0,
  unit_cost numeric(12, 2) not null default 0,
  supplier_id uuid references public.suppliers (id) on delete set null,
  storage_location_id uuid references public.storage_locations (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_category_idx on public.inventory_items (category);
create index inventory_items_supplier_id_idx on public.inventory_items (supplier_id);
create index inventory_items_storage_location_id_idx on public.inventory_items (storage_location_id);
create index inventory_items_is_active_idx on public.inventory_items (is_active);

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Orders & order items
-- =========================================================================

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  status public.order_status not null default 'draft',
  order_date date not null default current_date,
  due_date date,
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_created_by_idx on public.orders (created_by);

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'ORD-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger orders_set_order_number
  before insert on public.orders
  for each row
  execute function public.set_order_number();

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  description text not null,
  specifications jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_inventory_item_id_idx on public.order_items (inventory_item_id);

create trigger order_items_set_updated_at
  before update on public.order_items
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Production jobs & stages
-- =========================================================================

create sequence public.job_number_seq;

create table public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  status public.production_job_status not null default 'queued',
  priority public.production_priority not null default 'normal',
  assigned_to uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index production_jobs_order_item_id_idx on public.production_jobs (order_item_id);
create index production_jobs_status_idx on public.production_jobs (status);
create index production_jobs_assigned_to_idx on public.production_jobs (assigned_to);

create or replace function public.set_job_number()
returns trigger
language plpgsql
as $$
begin
  if new.job_number is null then
    new.job_number := 'JOB-' || lpad(nextval('public.job_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger production_jobs_set_job_number
  before insert on public.production_jobs
  for each row
  execute function public.set_job_number();

create trigger production_jobs_set_updated_at
  before update on public.production_jobs
  for each row
  execute function public.set_updated_at();

create table public.production_stages (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs (id) on delete cascade,
  stage_name public.production_stage_name not null,
  sequence smallint not null default 1,
  status public.production_stage_status not null default 'pending',
  assigned_to uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (production_job_id, sequence)
);

create index production_stages_production_job_id_idx on public.production_stages (production_job_id);
create index production_stages_status_idx on public.production_stages (status);
create index production_stages_assigned_to_idx on public.production_stages (assigned_to);

create trigger production_stages_set_updated_at
  before update on public.production_stages
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Tasks (optionally related to an order, production job, or customer)
-- =========================================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,
  order_id uuid references public.orders (id) on delete set null,
  production_job_id uuid references public.production_jobs (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_status_idx on public.tasks (status);
create index tasks_order_id_idx on public.tasks (order_id);
create index tasks_production_job_id_idx on public.tasks (production_job_id);
create index tasks_customer_id_idx on public.tasks (customer_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Inventory transactions (append-only ledger; quantity_on_hand is derived)
-- =========================================================================

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  transaction_type public.inventory_transaction_type not null,
  -- Signed delta applied to inventory_items.quantity_on_hand: positive
  -- increases stock, negative decreases it. The caller (application layer)
  -- is responsible for choosing the correct sign for a given transaction_type.
  quantity numeric(14, 3) not null check (quantity <> 0),
  reference_type public.inventory_reference_type not null default 'manual',
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_transactions_inventory_item_id_idx on public.inventory_transactions (inventory_item_id);
create index inventory_transactions_transaction_type_idx on public.inventory_transactions (transaction_type);
create index inventory_transactions_reference_idx on public.inventory_transactions (reference_type, reference_id);

create or replace function public.apply_inventory_transaction()
returns trigger
language plpgsql
as $$
begin
  update public.inventory_items
  set quantity_on_hand = quantity_on_hand + new.quantity
  where id = new.inventory_item_id;
  return new;
end;
$$;

create trigger inventory_transactions_apply
  after insert on public.inventory_transactions
  for each row
  execute function public.apply_inventory_transaction();

-- =========================================================================
-- Documents (invoices, IGI certificates, CAD files, images, shipping
-- labels, and other attachments)
-- =========================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  document_type public.document_type not null,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  mime_type text,
  order_id uuid references public.orders (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  production_job_id uuid references public.production_jobs (id) on delete set null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_document_type_idx on public.documents (document_type);
create index documents_order_id_idx on public.documents (order_id);
create index documents_order_item_id_idx on public.documents (order_item_id);
create index documents_customer_id_idx on public.documents (customer_id);
create index documents_production_job_id_idx on public.documents (production_job_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Activity logs (append-only audit trail across all modules)
-- =========================================================================

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type public.activity_entity_type not null,
  entity_id uuid,
  action text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index activity_logs_actor_id_idx on public.activity_logs (actor_id);
create index activity_logs_created_at_idx on public.activity_logs (created_at);

-- =========================================================================
-- Notifications
-- =========================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  notification_type public.notification_type not null,
  title text not null,
  message text,
  related_entity_type public.activity_entity_type,
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications (recipient_id);
create index notifications_is_read_idx on public.notifications (is_read);

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Settings (key/value system configuration)
-- =========================================================================

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row
  execute function public.set_updated_at();

-- =========================================================================
-- Row Level Security
--
-- This is an internal operations tool (not multi-tenant), so the baseline
-- is: any authenticated staff member can read and operate on day-to-day
-- CRM data. Narrower policies apply to employees (HR data), settings
-- (system config), notifications (per-recipient), and the two append-only
-- ledgers (activity_logs, inventory_transactions - insert/select only).
-- =========================================================================

alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.storage_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.production_jobs enable row level security;
alter table public.production_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.documents enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- Employees: HR data. Any staff member can see the directory; only admins
-- can change employment details.
create policy "Authenticated users can view employees"
  on public.employees for select
  to authenticated
  using (true);

create policy "Admins can manage employees"
  on public.employees for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Operational tables: full read/write for any authenticated staff member.
create policy "Authenticated users can manage customers"
  on public.customers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage suppliers"
  on public.suppliers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage storage locations"
  on public.storage_locations for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage inventory items"
  on public.inventory_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage orders"
  on public.orders for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage order items"
  on public.order_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage production jobs"
  on public.production_jobs for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage production stages"
  on public.production_stages for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage tasks"
  on public.tasks for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage documents"
  on public.documents for all
  to authenticated
  using (true)
  with check (true);

-- Append-only ledgers: insert and read, never update or delete.
create policy "Authenticated users can view inventory transactions"
  on public.inventory_transactions for select
  to authenticated
  using (true);

create policy "Authenticated users can record inventory transactions"
  on public.inventory_transactions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can view activity logs"
  on public.activity_logs for select
  to authenticated
  using (true);

create policy "Authenticated users can record activity logs"
  on public.activity_logs for insert
  to authenticated
  with check (true);

-- Notifications: users only see and manage their own; anyone authenticated
-- can create a notification addressed to another user (e.g. task assignment).
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

create policy "Authenticated users can create notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Settings: system configuration, admin-only in both directions.
create policy "Admins can manage settings"
  on public.settings for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
