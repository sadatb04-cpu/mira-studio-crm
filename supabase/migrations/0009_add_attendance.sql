-- =========================================================================
-- Sprint 5.0 - Employee Attendance & Time Tracking
--
-- One row per employee per calendar date. current_segment_started_at marks
-- when the *current* work-or-break segment began; total_worked_seconds and
-- total_break_seconds only hold *completed* segments - the live elapsed
-- time of the current segment is added on top by the application (both for
-- display and when a transition finalizes that segment).
-- =========================================================================

create type public.attendance_status as enum (
  'working',
  'on_break',
  'finished',
  'absent',
  'auto_closed'
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  check_in timestamptz,
  check_out timestamptz,
  total_worked_seconds integer not null default 0,
  total_break_seconds integer not null default 0,
  current_segment_started_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);

create index attendance_records_employee_id_idx on public.attendance_records (employee_id);
create index attendance_records_date_idx on public.attendance_records (date);
create index attendance_records_status_idx on public.attendance_records (status);

create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row
  execute function public.set_updated_at();

alter type public.activity_entity_type add value 'attendance_record';

alter table public.attendance_records enable row level security;

create policy "Authenticated users can manage attendance records"
  on public.attendance_records for all
  to authenticated
  using (true)
  with check (true);

-- =========================================================================
-- Reconciliation: idempotent, callable both from a pg_cron schedule and
-- from the application on every attendance page load (Sprint brief:
-- "the system should be eventually consistent even if pg_cron is
-- unavailable"). SECURITY DEFINER so it can read the (admin-only) settings
-- table and touch every employee's records regardless of which caller's
-- session triggered it - search_path is pinned per Postgres's
-- security-definer hardening guidance.
-- =========================================================================

create or replace function public.reconcile_attendance()
returns table(absences_marked integer, sessions_closed integer)
security definer
set search_path = public, pg_temp
language plpgsql
as $$
declare
  v_cutoff_time time;
  v_absences_marked integer := 0;
  v_sessions_closed integer := 0;
  v_row record;
  v_cutoff_ts timestamptz;
  v_close_at timestamptz;
  v_new_attendance_id uuid;
begin
  select coalesce((value->>'attendanceCutoffTime')::time, '18:00'::time)
  into v_cutoff_time
  from public.settings where key = 'business_rules';

  if v_cutoff_time is null then
    v_cutoff_time := '18:00'::time;
  end if;

  -- 1. Auto-close any open session (working/on_break) whose date's cutoff
  -- has already passed. Guarded by status IN (...), so re-running this is
  -- a no-op for records already closed.
  for v_row in
    select ar.id, ar.status, ar.current_segment_started_at, ar.date
    from public.attendance_records ar
    where ar.status in ('working', 'on_break')
      and (ar.date + v_cutoff_time) <= now()
  loop
    v_cutoff_ts := v_row.date + v_cutoff_time;
    -- Never close earlier than the segment actually started (guards a
    -- session that begins after its own day's cutoff has already passed).
    v_close_at := greatest(v_cutoff_ts, v_row.current_segment_started_at);

    if v_row.status = 'working' then
      update public.attendance_records
      set status = 'auto_closed',
          check_out = v_close_at,
          total_worked_seconds = total_worked_seconds + extract(epoch from (v_close_at - current_segment_started_at))::integer,
          current_segment_started_at = null,
          notes = 'Automatically closed at the configured cutoff time.'
      where id = v_row.id;
    else
      update public.attendance_records
      set status = 'auto_closed',
          check_out = v_close_at,
          total_break_seconds = total_break_seconds + extract(epoch from (v_close_at - current_segment_started_at))::integer,
          current_segment_started_at = null,
          notes = 'Automatically closed at the configured cutoff time (was on break).'
      where id = v_row.id;
    end if;

    insert into public.activity_logs (entity_type, entity_id, action, description, actor_id)
    values ('attendance_record', v_row.id, 'auto_closed', 'Session automatically closed at the configured cutoff time.', null);

    v_sessions_closed := v_sessions_closed + 1;
  end loop;

  -- 2. Mark absent any active employee with no attendance record for a
  -- finalized date, bounded to the last 7 days (or their hire date, if
  -- more recent) so this never floods years of retroactive "absent" rows
  -- for employees hired long before this feature existed.
  for v_row in
    select e.id as employee_id, d.the_date
    from public.employees e
    cross join lateral (
      select generate_series(
        greatest(coalesce(e.hire_date, current_date - 7), current_date - 7)::timestamp,
        current_date::timestamp,
        interval '1 day'
      )::date as the_date
    ) d
    where e.employment_status = 'active'
      and (d.the_date + v_cutoff_time) <= now()
      and not exists (
        select 1 from public.attendance_records ar
        where ar.employee_id = e.id and ar.date = d.the_date
      )
  loop
    v_new_attendance_id := null;

    insert into public.attendance_records (employee_id, date, status, notes)
    values (v_row.employee_id, v_row.the_date, 'absent', 'No check-in recorded for this date.')
    on conflict (employee_id, date) do nothing
    returning id into v_new_attendance_id;

    if v_new_attendance_id is not null then
      insert into public.activity_logs (entity_type, entity_id, action, description, actor_id)
      values ('attendance_record', v_new_attendance_id, 'marked_absent', 'Automatically marked absent - no check-in recorded.', null);

      v_absences_marked := v_absences_marked + 1;
    end if;
  end loop;

  return query select v_absences_marked, v_sessions_closed;
end;
$$;

grant execute on function public.reconcile_attendance() to authenticated;

-- Best-effort scheduled automation on top of the reconciliation-on-read
-- fallback above. Wrapped so a project/plan without pg_cron available
-- never fails this migration - the application-level fallback (calling
-- reconcile_attendance() before rendering attendance pages) is what
-- guarantees correctness either way.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron unavailable on this project - skipping scheduled automation, relying on reconciliation-on-read only.';
end;
$$;

do $$
begin
  perform cron.schedule(
    'reconcile-attendance',
    '*/15 * * * *',
    $job$select public.reconcile_attendance();$job$
  );
exception when others then
  raise notice 'Could not schedule the pg_cron job for attendance reconciliation - relying on reconciliation-on-read only.';
end;
$$;
