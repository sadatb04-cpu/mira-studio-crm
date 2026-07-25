-- =========================================================================
-- Security Sprint 1.0 - Private Authentication
--
-- Two independent changes bundled in one migration:
--
-- 1. profiles.account_status - the real, enforced login gate. is_active
--    is left untouched (it already has zero enforcement effect anywhere
--    in this app - grep confirms it's only ever displayed, never checked -
--    so account_status becomes the new source of truth without touching
--    is_active's existing, already-decorative behavior).
--
-- 2. Decouple employees from profiles/auth accounts. Today employees.id
--    IS profiles.id (1:1, enforced by a FK) - every employee is forced to
--    have a CRM login. The brief requires employees to exist without CRM
--    access, with an account linked (or not) after the fact. employees
--    gets its own identity columns (full_name/email/phone/department) as
--    the authoritative HR data regardless of linkage, and a new nullable
--    user_id column is the one-way link to a CRM account when granted.
-- =========================================================================

create type public.account_status as enum (
  'active',
  'suspended',
  'disabled',
  'pending_invite'
);

alter table public.profiles
  add column account_status public.account_status not null default 'active';

-- Backfill: every existing profile was previously gated only by is_active.
update public.profiles set account_status = 'disabled' where is_active = false;

-- Admins need to be able to create a profile row for someone ELSE (the new
-- admin-managed account creation flow) - only self-insert existed before.
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

-- =========================================================================
-- Employees <-> accounts decoupling
-- =========================================================================

alter table public.employees add column user_id uuid references public.profiles (id) on delete set null;
alter table public.employees add column full_name text;
alter table public.employees add column email text;
alter table public.employees add column phone text;
alter table public.employees add column department public.department;

-- Backfill: every existing employee row today has id = profiles.id, so
-- this is exactly the same data, just copied onto employees' own columns.
update public.employees e
set user_id = e.id,
    full_name = p.full_name,
    email = p.email,
    phone = p.phone,
    department = p.department
from public.profiles p
where p.id = e.id;

alter table public.employees alter column full_name set not null;

-- Free employees.id from having to equal a profiles.id - it's now an
-- independent identity; user_id (above) is the only link to a CRM account.
alter table public.employees drop constraint employees_id_fkey;
alter table public.employees alter column id set default gen_random_uuid();

create index employees_user_id_idx on public.employees (user_id);

-- No other RLS changes: `employees` and `profiles` keep every existing
-- policy untouched (both already allow any authenticated user to read
-- employees, and profiles keeps its self-select/self-update/admin-all
-- policies exactly as they were) - only the one new admin-insert policy
-- above was added.
