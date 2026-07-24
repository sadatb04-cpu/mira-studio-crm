-- =========================================================================
-- Document folders (organizational metadata only - Storage bucket layout
-- is untouched; a folder groups documents purely via documents.folder_id).
-- =========================================================================

create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger document_folders_set_updated_at
  before update on public.document_folders
  for each row
  execute function public.set_updated_at();

alter table public.documents
  add column folder_id uuid references public.document_folders (id) on delete set null;

create index documents_folder_id_idx on public.documents (folder_id);

-- Deleting a folder must never delete the documents inside it - on delete
-- set null (above) guarantees that at the database level, so the
-- application layer doesn't need to move documents out first.

alter type public.activity_entity_type add value 'document_folder';

alter table public.document_folders enable row level security;

create policy "Authenticated users can manage document folders"
  on public.document_folders for all
  to authenticated
  using (true)
  with check (true);
