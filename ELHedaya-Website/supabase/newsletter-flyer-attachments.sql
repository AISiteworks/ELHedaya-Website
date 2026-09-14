-- EL Hedaya newsletter flyer attachments
-- Run this once in Supabase SQL Editor AFTER the original newsletter.sql.

alter table public.newsletter_campaigns
  add column if not exists attachment_name text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'newsletter-attachments',
  'newsletter-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Newsletter admins can upload flyer attachments" on storage.objects;
drop policy if exists "Newsletter admins can read flyer attachments" on storage.objects;
drop policy if exists "Newsletter admins can delete flyer attachments" on storage.objects;

create policy "Newsletter admins can upload flyer attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'newsletter-attachments'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Newsletter admins can read flyer attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'newsletter-attachments'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Newsletter admins can delete flyer attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'newsletter-attachments'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (storage.foldername(name))[1] = auth.uid()::text
);
