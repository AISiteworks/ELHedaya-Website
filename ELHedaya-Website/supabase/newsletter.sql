-- EL Hedaya newsletter subscribers + campaign history
-- Run this once in Supabase SQL Editor.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  headline text not null,
  body text not null,
  cta_label text,
  cta_url text,
  status text not null default 'sending' check (status in ('sending','sent','partial','failed')),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns enable row level security;

-- Public visitors subscribe through an RPC rather than direct table inserts.
create or replace function public.subscribe_newsletter(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  insert into public.newsletter_subscribers (email, is_active, unsubscribe_token, source, updated_at, unsubscribed_at)
  values (v_email, true, gen_random_uuid(), 'website', now(), null)
  on conflict (email) do update
    set is_active = true,
        unsubscribe_token = gen_random_uuid(),
        updated_at = now(),
        unsubscribed_at = null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.unsubscribe_newsletter(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.newsletter_subscribers
  set is_active = false,
      unsubscribed_at = now(),
      updated_at = now()
  where unsubscribe_token = p_token;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'message', 'This unsubscribe link is no longer valid.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
revoke all on function public.unsubscribe_newsletter(uuid) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to anon, authenticated;

grant select, update on public.newsletter_subscribers to authenticated;
grant select on public.newsletter_campaigns to authenticated;

drop policy if exists "Newsletter admins can read subscribers" on public.newsletter_subscribers;
drop policy if exists "Newsletter admins can update subscribers" on public.newsletter_subscribers;
drop policy if exists "Newsletter admins can read campaign history" on public.newsletter_campaigns;

create policy "Newsletter admins can read subscribers"
on public.newsletter_subscribers for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Newsletter admins can update subscribers"
on public.newsletter_subscribers for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Newsletter admins can read campaign history"
on public.newsletter_campaigns for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (is_active, created_at desc);
create index if not exists newsletter_campaigns_created_idx
  on public.newsletter_campaigns (created_at desc);

-- Newsletter flyer attachment support (V10)
alter table public.newsletter_campaigns
  add column if not exists attachment_name text;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'newsletter-attachments',
  'newsletter-attachments',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','image/gif']::text[]
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
