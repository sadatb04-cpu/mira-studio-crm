-- =========================================================================
-- Attendance: support multiple work sessions per employee per day.
--
-- attendance_records previously held exactly one row per (employee, date).
-- It now holds one row per SESSION - an employee can Start Work, Finish,
-- then Start a New Session later the same day, any number of times.
-- "Today's worked/break time" and "sessions today" are derived by summing
-- across every session row for that date, computed in the application
-- layer (fetch simple, aggregate in JS - same pattern used everywhere
-- else in this app) rather than a stored per-day total.
--
-- The old unique(employee_id, date) constraint is dropped so multiple
-- session rows per day are allowed. A narrower partial unique index
-- takes its place, preserving the one guarantee that still needs
-- database-level enforcement: at most one auto-inserted "absent" row per
-- employee per day (absent still means "zero sessions that day", which
-- is inherently a whole-day fact, not a per-session one).
-- =========================================================================

alter table public.attendance_records drop constraint attendance_records_employee_id_date_key;

create unique index attendance_records_one_absent_per_day
  on public.attendance_records (employee_id, date)
  where status = 'absent';

create index attendance_records_employee_date_idx on public.attendance_records (employee_id, date);

-- Reconciliation is otherwise unchanged: the auto-close loop already
-- operates per-row (never assumed one row per day), so multiple sessions
-- already "just worked" there - only the absent-insertion's ON CONFLICT
-- target needs to switch to the new partial index.
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
