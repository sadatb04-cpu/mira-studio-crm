-- =========================================================================
-- Single source of truth: every CRM account gets exactly one linked
-- employee record.
--
-- Since migration 0010 ("Private Authentication"), employees and CRM
-- accounts have been deliberately decoupled - an HR employee record can
-- exist with no CRM login (factory floor staff, etc.), linked via the
-- nullable employees.user_id column. That decoupling stays; what was
-- missing was the OTHER direction - creating a CRM account (Settings ->
-- Users -> Add User) never auto-created the matching employee record
-- unless an admin manually picked an existing unlinked one from the "Link
-- Employee" dropdown. Skip that step and Attendance had nothing to look
-- up: "You haven't been added as an employee yet."
--
-- Three changes:
-- 1. A unique partial index - one employee record per linked account, so
--    the new auto-provisioning (createUserAccount, ensureLinkedEmployeeId)
--    can never create a duplicate, even under a race.
-- 2. A narrow self-insert RLS policy so a user's own attendance page load
--    can silently create their own missing employee record (Attendance's
--    self-healing fallback - see ensureLinkedEmployeeId in
--    lib/supabase/attendance.ts) without needing admin/service-role
--    access. Mirrors the existing "Users can insert own profile" policy.
-- 3. A one-time backfill for every profile created before this existed.
-- =========================================================================

create unique index employees_user_id_unique_idx on public.employees (user_id) where user_id is not null;

create policy "Users can create their own employee record"
  on public.employees for insert
  to authenticated
  with check (user_id = auth.uid());

-- Backfill: copies name/email/department from the profile and uses the
-- account's creation date as a reasonable hire_date default - exactly what
-- createUserAccount() now does automatically going forward, applied
-- retroactively to every account that predates this migration.
insert into public.employees (user_id, full_name, email, department, employment_status, hire_date)
select p.id, p.full_name, p.email, p.department, 'active', p.created_at::date
from public.profiles p
where not exists (select 1 from public.employees e where e.user_id = p.id);
