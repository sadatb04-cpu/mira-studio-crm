-- =========================================================================
-- Seed the new 'tasks' module for every existing profile, using the same
-- per-role logic 0011 used for the original 10 modules. Split into its own
-- migration because a freshly added enum value can't be used in the same
-- transaction that added it (0012).
-- =========================================================================

do $$
declare
  v_profile record;
  v_can_view boolean;
  v_can_create boolean;
  v_can_edit boolean;
  v_can_delete boolean;
begin
  for v_profile in select id, role from public.profiles loop
    if v_profile.role in ('admin', 'operations_manager') then
      v_can_view := true;
      v_can_create := true;
      v_can_edit := true;
      v_can_delete := true;
    else
      -- Tasks wasn't gated at all before this - every existing role
      -- previously had unrestricted access via permissive RLS, so it's
      -- seeded viewable/editable here too rather than silently taking
      -- away something nobody was ever asked to give up. Delete stays
      -- off by default, matching every other non-admin module template.
      v_can_view := true;
      v_can_create := true;
      v_can_edit := true;
      v_can_delete := false;
    end if;

    insert into public.user_permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
    values (v_profile.id, 'tasks', v_can_view, v_can_create, v_can_edit, v_can_delete)
    on conflict (profile_id, module) do nothing;
  end loop;
end;
$$;
