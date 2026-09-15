-- EL Hedaya volunteer interest form
create table if not exists public.volunteer_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  relationship text,
  interests text[] not null default '{}',
  availability text[] not null default '{}',
  message text,
  status text not null default 'new' check (status in ('new','contacted','approved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists volunteer_submissions_created_at_idx on public.volunteer_submissions(created_at desc);
create index if not exists volunteer_submissions_status_idx on public.volunteer_submissions(status);

alter table public.volunteer_submissions enable row level security;

drop policy if exists "EL Hedaya admin volunteer access" on public.volunteer_submissions;
create policy "EL Hedaya admin volunteer access"
on public.volunteer_submissions
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on public.volunteer_submissions from anon;
grant select, insert, update, delete on public.volunteer_submissions to authenticated;
