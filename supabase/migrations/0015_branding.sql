-- =========================================================================
-- Branding: a dedicated public Storage bucket for the company logo, plus a
-- narrow public-read carve-out on `settings` so the login page and root
-- layout can render branding before a user is authenticated.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 5242880, array['image/png', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

-- Only admins can write branding assets; the bucket's own `public` flag
-- already serves reads via the public URL endpoint with no RLS involved,
-- but an explicit select policy also covers the authenticated client
-- (e.g. listing the current object before replacing it).
create policy "Admins can upload branding assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.current_user_role() = 'admin');

create policy "Admins can update branding assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.current_user_role() = 'admin')
  with check (bucket_id = 'branding' and public.current_user_role() = 'admin');

create policy "Admins can delete branding assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.current_user_role() = 'admin');

create policy "Anyone can view branding assets"
  on storage.objects for select
  using (bucket_id = 'branding');

-- Settings: `branding` is the one key that must be readable by everyone,
-- including signed-out visitors on the login page - additive to (not a
-- replacement for) "Admins can manage settings", so every other key stays
-- admin-only in both directions.
create policy "Anyone can view branding settings"
  on public.settings for select
  to anon, authenticated
  using (key = 'branding');
