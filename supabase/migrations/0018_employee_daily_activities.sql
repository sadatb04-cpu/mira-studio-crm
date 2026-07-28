-- =========================================================================
-- Daily Activity Tracker: a lightweight per-session work journal linked to
-- attendance. Each row is one activity an employee logged for the day;
-- activity_date drives the "resets every day" behavior (nothing is
-- deleted - each day's activities simply live under their own date).
-- =========================================================================

create type public.activity_status as enum ('pending', 'in_progress', 'completed');

create table public.employee_daily_activities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_id uuid references public.attendance_records (id) on delete set null,
  activity_title text not null,
  description text,
  notes text,
  status public.activity_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  -- Computed in the application layer at completion time (mirrors how
  -- attendance_records' own worked/break seconds are app-computed, not
  -- trigger-derived) and locked afterward - never recomputed on read.
  duration_minutes integer,
  activity_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_daily_activities_employee_id_idx on public.employee_daily_activities (employee_id);
create index employee_daily_activities_activity_date_idx on public.employee_daily_activities (activity_date);
create index employee_daily_activities_status_idx on public.employee_daily_activities (status);

-- Defense in depth for "only one activity In Progress at a time" - the
-- server action already enforces this, but a partial unique index makes
-- it impossible even under a race, matching the same pattern used for
-- attendance_records' "at most one auto-absent row per day" constraint.
create unique index employee_daily_activities_one_in_progress_idx
  on public.employee_daily_activities (employee_id)
  where status = 'in_progress';

create trigger employee_daily_activities_set_updated_at
  before update on public.employee_daily_activities
  for each row
  execute function public.set_updated_at();

alter table public.employee_daily_activities enable row level security;

-- Same model as attendance_records itself and every other operational
-- table here: RLS is authentication-only, and "employees only see their
-- own activities, managers see everyone's" is enforced by which queries
-- the application layer runs (server actions resolve the caller's own
-- linked employee id and scope employee-facing queries to it; only
-- manager-gated actions/queries ever read or write another employee's
-- rows) - not by a row-ownership RLS policy.
create policy "Authenticated users can manage employee daily activities"
  on public.employee_daily_activities for all
  to authenticated
  using (true)
  with check (true);
