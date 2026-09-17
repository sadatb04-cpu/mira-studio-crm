-- =========================================================================
-- Sales module, Phase 1: raw lead capture.
--
-- Deliberately minimal per the module's own philosophy - "capture the
-- minimum information required to identify and contact a lead, enrich the
-- record only when information becomes known." full_name/phone are the only
-- required columns; source/notes/interested_product/requirements_notes/
-- assigned_to/priority/next_follow_up_at are all nullable and unused by the
-- Quick Add UI in this phase - they exist now so later phases (qualification
-- UI, assignment, follow-ups) never need a second migration just to add a
-- text/date column.
--
-- No UNIQUE constraint on phone/email by design - real-world duplicate
-- leads (typos, shared family numbers) must never be silently rejected at
-- INSERT time. Duplicate detection is a reviewable step in the future
-- import workflow, not a DB invariant enforced here.
-- =========================================================================

alter type public.permission_module add value 'sales';

alter type public.activity_entity_type add value 'lead';

create type public.lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'unqualified'
);

create type public.lead_source as enum (
  'instagram',
  'facebook',
  'whatsapp',
  'website',
  'google',
  'referral',
  'email',
  'cold_outreach',
  'import',
  'other'
);

create type public.lead_priority as enum ('low', 'medium', 'high');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  source public.lead_source,
  status public.lead_status not null default 'new',
  priority public.lead_priority not null default 'medium',
  assigned_to uuid references public.profiles (id) on delete set null,
  notes text,
  -- Enrichment fields - always nullable, never written by Quick Add or its
  -- createLead validation schema. Only a later qualification workflow sets
  -- these.
  interested_product text,
  requirements_notes text,
  next_follow_up_at date,
  -- Set only by the future Lead -> Customer conversion action (not built in
  -- this phase). The lead row is never deleted on conversion - this is a
  -- one-directional pointer preserving the lead's full history.
  converted_customer_id uuid references public.customers (id) on delete set null,
  converted_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

-- List/status/source filters and default sort.
create index leads_status_idx on public.leads (status);
create index leads_source_idx on public.leads (source);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index leads_created_at_idx on public.leads (created_at desc);

-- Exact-match lookups for the future import workflow's duplicate detection
-- (exact phone OR exact email) and for quick manual "does this number
-- already exist" checks - plain B-tree, not trigram, since these are
-- exact-match lookups (findDuplicatesByKey-style), not substring search.
create index leads_phone_idx on public.leads (phone);
create index leads_email_idx on public.leads (lower(email));

-- Trigram indexes for the leads list's actual substring ILIKE search
-- (getLeads()'s .or(full_name.ilike, phone.ilike, email.ilike)) - pg_trgm
-- is already enabled (see migration 0020). full_name/email mirror
-- customers_full_name_trgm_idx/customers_email_trgm_idx exactly, since
-- both tables search the same two fields the same way; phone gets the same
-- treatment here because, unlike Customers, the Sales list's search box
-- explicitly searches phone too (see requirements for Quick Add/lead list).
-- These are additional to, not a replacement for, the plain exact-match
-- indexes above - the two serve different query shapes.
create index leads_full_name_trgm_idx on public.leads using gin (full_name gin_trgm_ops);
create index leads_phone_trgm_idx on public.leads using gin (phone gin_trgm_ops);
create index leads_email_trgm_idx on public.leads using gin (email gin_trgm_ops);

alter table public.leads enable row level security;

-- Same blanket "any authenticated staff member can manage" policy shape
-- used by every operational table in this schema - all real view/create/
-- edit/delete authorization happens in the application layer via
-- requireModulePermission(supabase, "sales", action), not RLS. Per-lead
-- (assigned-only) visibility was explicitly evaluated and rejected in favor
-- of the existing module-level permission model.
create policy "Authenticated users can manage leads"
  on public.leads for all
  to authenticated
  using (true)
  with check (true);

-- No user_permissions seeding: admins get full access to every
-- PERMISSION_MODULES entry at runtime regardless of stored rows (see
-- getUserPermissions()), and the "sales" role template is updated in code
-- (src/types/permission.ts) to include the new module - existing sales-role
-- users pick it up the next time an admin (re-)applies that template from
-- Settings -> User Access, exactly like every other module added this way.
