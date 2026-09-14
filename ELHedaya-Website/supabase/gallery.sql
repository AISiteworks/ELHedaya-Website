-- EL Hedaya Islamic School picture gallery
-- Run this once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.school_gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text,
  image_url text not null,
  storage_path text,
  source_type text not null default 'url' check (source_type in ('url', 'upload')),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.school_gallery enable row level security;

-- Anyone may view published gallery pictures.
drop policy if exists "Public can view published school gallery" on public.school_gallery;
create policy "Public can view published school gallery"
on public.school_gallery
for select
using (is_published = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Only users with app_metadata.role = admin may change the gallery.
drop policy if exists "Admins can insert school gallery" on public.school_gallery;
create policy "Admins can insert school gallery"
on public.school_gallery
for insert
to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update school gallery" on public.school_gallery;
create policy "Admins can update school gallery"
on public.school_gallery
for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete school gallery" on public.school_gallery;
create policy "Admins can delete school gallery"
on public.school_gallery
for delete
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Public bucket for school gallery images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-gallery',
  'school-gallery',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for gallery objects.
drop policy if exists "Public can view school gallery objects" on storage.objects;
create policy "Public can view school gallery objects"
on storage.objects
for select
using (bucket_id = 'school-gallery');

-- Admin upload/delete access.
drop policy if exists "Admins can upload school gallery objects" on storage.objects;
create policy "Admins can upload school gallery objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-gallery'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can delete school gallery objects" on storage.objects;
create policy "Admins can delete school gallery objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-gallery'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- IMPORTANT ADMIN STEP
-- Create the administrator in Authentication > Users, then add this to that user's app_metadata:
-- {"role":"admin"}
-- You can set app_metadata with a secure server/service-role workflow or from the Supabase dashboard tooling.
