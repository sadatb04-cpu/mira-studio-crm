-- =========================================================================
-- Sprint 4.13 - User Permissions & Module Access Control
--
-- Roles remain the default; this table is what actually gates access.
-- Every existing user is seeded according to their CURRENT role so day-one
-- access is unchanged - admins can then customize from Settings ->
-- User Access. Admins always get full access (both seeded here AND via a
-- runtime bypass in getUserPermissions(), so a missing/misconfigured row
-- can never lock an admin out).
-- =========================================================================

create type public.permission_module as enum (
  'dashboard',
  'orders',
  'quotations',
  'customers',
  'production',
  'inventory',
  'documents',
  'employees',
  'attendance',
  'reports',
  'settings'
);

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  module public.permission_module not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, module)
);

create index user_permissions_profile_id_idx on public.user_permissions (profile_id);

create trigger user_permissions_set_updated_at
  before update on public.user_permissions
  for each row
  execute function public.set_updated_at();

-- Structured JSON rather than a dedicated table: there are exactly 10 fixed
-- keys, always read/written as one bundle per user (never queried
-- individually), the same pattern already used for settings.value.
alter table public.profiles add column special_permissions jsonb not null default '{}'::jsonb;

alter table public.user_permissions enable row level security;

create policy "Admins can manage user permissions"
  on public.user_permissions for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Users can view own permissions"
  on public.user_permissions for select
  to authenticated
  using (profile_id = auth.uid());

-- =========================================================================
-- Seed every existing profile per their current role, so nobody's access
-- changes the moment this migration lands.
-- =========================================================================

do $$
declare
  v_profile record;
  v_modules public.permission_module[];
  v_module public.permission_module;
  v_special jsonb;
  v_can_create boolean;
  v_can_edit boolean;
  v_can_delete boolean;
begin
  for v_profile in select id, role from public.profiles loop
    v_special := '{}'::jsonb;

    if v_profile.role = 'admin' then
      v_modules := enum_range(null::public.permission_module);
      v_special := jsonb_build_object(
        'release_to_production', true, 'approve_quotation', true, 'send_quotation', true,
        'view_financial_pricing', true, 'manage_employees', true, 'manage_users', true,
        'manage_permissions', true, 'export_reports', true, 'delete_documents', true,
        'view_activity_logs', true
      );
    elsif v_profile.role = 'operations_manager' then
      -- Previously had unrestricted access to every module via permissive
      -- RLS - preserved here, short of the two admin-exclusive account/
      -- permission-management specials.
      v_modules := enum_range(null::public.permission_module);
      v_special := jsonb_build_object(
        'release_to_production', true, 'approve_quotation', true, 'send_quotation', true,
        'view_financial_pricing', true, 'manage_employees', true, 'manage_users', false,
        'manage_permissions', false, 'export_reports', true, 'delete_documents', true,
        'view_activity_logs', true
      );
    elsif v_profile.role = 'production_manager' then
      v_modules := array['dashboard', 'production', 'inventory', 'attendance', 'documents']::public.permission_module[];
      v_special := jsonb_build_object('release_to_production', true);
    elsif v_profile.role = 'sales' then
      v_modules := array['dashboard', 'orders', 'customers', 'quotations', 'documents', 'attendance']::public.permission_module[];
      v_special := jsonb_build_object('send_quotation', true, 'approve_quotation', true, 'view_financial_pricing', true);
    else
      -- 'employee' (and any future role not explicitly handled above)
      v_modules := array['dashboard', 'attendance', 'documents']::public.permission_module[];
    end if;

    -- Admins/operations managers get full CRUD on every seeded module
    -- (matches their previously-unrestricted access); every other role's
    -- template grants view/create/edit but never delete by default - the
    -- more cautious default for a brand-new permission system, which an
    -- admin can still loosen per user from Settings -> User Access.
    v_can_create := v_profile.role in ('admin', 'operations_manager');
    v_can_edit := v_profile.role in ('admin', 'operations_manager');
    v_can_delete := v_profile.role in ('admin', 'operations_manager');

    if v_profile.role not in ('admin', 'operations_manager') then
      v_can_create := true;
      v_can_edit := true;
    end if;

    foreach v_module in array v_modules loop
      insert into public.user_permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
      values (v_profile.id, v_module, true, v_can_create, v_can_edit, v_can_delete)
      on conflict (profile_id, module) do nothing;
    end loop;

    update public.profiles set special_permissions = v_special where id = v_profile.id;
  end loop;
end;
$$;
