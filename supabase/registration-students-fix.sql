-- EL Hedaya registration module repair
-- Use this if the earlier registration.sql failed with:
-- column "registration_id" does not exist
-- This intentionally DOES NOT modify public.students.

create table if not exists public.registration_students (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text,
  grade text not null,
  returning_student boolean not null default false,
  medical_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists registration_students_registration_id_idx
  on public.registration_students(registration_id);

alter table public.registration_students enable row level security;

drop policy if exists "EL Hedaya admin all" on public.registration_students;
create policy "EL Hedaya admin all"
on public.registration_students
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on public.registration_students from anon;
grant select, insert, update, delete on public.registration_students to authenticated;
