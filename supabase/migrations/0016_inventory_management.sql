-- =========================================================================
-- Inventory Management: jewelry-specific item fields, item<->document
-- linking (images/certificates/etc, reusing the existing documents module
-- rather than a parallel attachment system), and an import-batch audit log
-- that also doubles as the foundation for a future Google Sheets
-- auto-sync (google_sheet_url is recorded per batch for that purpose,
-- though no scheduled re-sync runs yet).
-- =========================================================================

alter table public.inventory_items
  add column reorder_level numeric(14, 3) not null default 0,
  add column selling_price numeric(12, 2) not null default 0,
  add column metal text,
  add column purity text,
  add column weight numeric(10, 3),
  add column stone_type text,
  add column stone_weight numeric(10, 3),
  add column certificate_number text,
  add column notes text;

alter table public.documents
  add column inventory_item_id uuid references public.inventory_items (id) on delete set null;

create index documents_inventory_item_id_idx on public.documents (inventory_item_id);

create table public.inventory_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('xlsx', 'csv', 'pdf', 'google_sheets')),
  source_name text not null,
  google_sheet_url text,
  total_rows integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  imported_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inventory_import_batches enable row level security;

-- Append-only audit log, same shape as activity_logs: any authenticated
-- staff member can read/insert, nobody can update or delete a past import
-- record.
create policy "Authenticated users can view inventory import batches"
  on public.inventory_import_batches for select
  to authenticated
  using (true);

create policy "Authenticated users can record inventory import batches"
  on public.inventory_import_batches for insert
  to authenticated
  with check (true);
