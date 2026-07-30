-- =========================================================================
-- Debounce attendance reconciliation.
--
-- reconcile_attendance() is called unconditionally on every /attendance
-- page view, by every employee and every manager, as a fallback for
-- projects where pg_cron isn't running it on a schedule. Its second pass
-- (marking absences) is a cross join of every active employee against up
-- to 8 days, each with a correlated NOT EXISTS subquery - a real cost to
-- repeat on every single page render, especially when several people view
-- the page within moments of each other.
--
-- This doesn't change what reconciliation does or when data becomes
-- eventually consistent (pg_cron, where configured, already reconciles on
-- its own schedule independent of this) - it only skips repeating the scan
-- if it already ran within the last few minutes. The rate-limit state is
-- tracked in a table with RLS enabled and no policies at all, so no role
-- can read or write it directly; only this SECURITY DEFINER function
-- touches it, via its owner privileges.
-- =========================================================================

create table public.attendance_reconciliation_state (
  id boolean primary key default true,
  last_run_at timestamptz not null default '1970-01-01T00:00:00Z',
  constraint attendance_reconciliation_state_singleton check (id)
);

insert into public.attendance_reconciliation_state (id, last_run_at)
values (true, '1970-01-01T00:00:00Z'::timestamptz);

alter table public.attendance_reconciliation_state enable row level security;
-- Deliberately no policies - not even for admins. Nothing needs to read or
-- write this directly; it exists solely as internal state for the function
-- below, which bypasses RLS via its SECURITY DEFINER ownership.

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
  v_acquired boolean;
begin
  -- Atomic rate limit: only one caller within any 5-minute window actually
  -- runs the scans below - the UPDATE's row lock serializes concurrent
  -- attempts, so this is race-safe under simultaneous requests from
  -- different employees/instances, not just a single-process debounce.
  update public.attendance_reconciliation_state
  set last_run_at = now()
  where id = true and last_run_at <= now() - interval '5 minutes'
  returning true into v_acquired;

  if v_acquired is null then
    return query select 0, 0;
  end if;

  select coalesce((value->>'attendanceCutoffTime')::time, '18:00'::time)
  into v_cutoff_time
  from public.settings where key = 'business_rules';

  if v_cutoff_time is null then
    v_cutoff_time := '18:00'::time;
  end if;

  -- 1. Auto-close any open session (working/on_break) whose date's cutoff
  -- has already passed. Operates per session row, so a forgotten last
  -- session is closed on its own - any earlier, already-finished sessions
  -- for that same day are untouched (they're separate rows entirely).
  for v_row in
    select ar.id, ar.status, ar.current_segment_started_at, ar.date
    from public.attendance_records ar
    where ar.status in ('working', 'on_break')
      and (ar.date + v_cutoff_time) <= now()
  loop
    v_cutoff_ts := v_row.date + v_cutoff_time;
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

  -- 2. Mark absent any active employee with NO session at all for a
  -- finalized date - unchanged semantics from before (a day with any
  -- session, finished or otherwise, is never "absent").
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
    on conflict (employee_id, date) where status = 'absent' do nothing
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
