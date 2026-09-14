-- EL Hedaya Registration + Square payment module
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create sequence if not exists public.el_hedaya_registration_seq start with 1 increment by 1;

create or replace function public.next_el_hedaya_registration_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'EH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.el_hedaya_registration_seq')::text, 5, '0');
$$;

create table if not exists public.registration_settings (
  id smallint primary key default 1 check (id = 1),
  registration_open boolean not null default true,
  school_year text not null default '2026-2027',
  term_name text not null default 'Fall Semester',
  registration_deadline date,
  welcome_message text default 'Register your children for EL Hedaya Islamic School.',
  confirmation_message text default 'Jazakum Allahu Khairan. Your registration has been received.',
  contact_email text default 'cicenter1435@gmail.com',
  contact_phone text default '336-766-0824',
  currency text not null default 'USD' check (char_length(currency) = 3),
  updated_at timestamptz not null default now()
);

insert into public.registration_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.registration_fees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  amount_cents integer not null check (amount_cents >= 0),
  kind text not null default 'charge' check (kind in ('charge','discount')),
  scope text not null default 'student' check (scope in ('student','family')),
  is_optional boolean not null default false,
  applies_after_students integer not null default 0 check (applies_after_students >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe default. Admin can change/delete/disable it later.
insert into public.registration_fees (name, description, amount_cents, kind, scope, is_optional, applies_after_students, is_active, sort_order)
select 'Semester Tuition', 'EL Hedaya semester tuition', 15000, 'charge', 'student', false, 0, true, 10
where not exists (select 1 from public.registration_fees);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  client_request_id text not null unique,
  registration_number text not null unique default public.next_el_hedaya_registration_number(),
  guardian_first_name text not null,
  guardian_last_name text not null,
  guardian_email text not null,
  guardian_phone text not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  school_year text,
  term_name text,
  notes text,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','offline','waived','refunded')),
  square_payment_id text,
  square_receipt_url text,
  payment_error text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.registration_fee_lines (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  fee_id uuid references public.registration_fees(id) on delete set null,
  fee_name text not null,
  description text,
  kind text not null check (kind in ('charge','discount')),
  scope text not null check (scope in ('student','family')),
  unit_amount_cents integer not null,
  quantity integer not null check (quantity >= 0),
  total_cents integer not null,
  is_optional boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.registration_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  provider text not null default 'square',
  idempotency_key text unique,
  provider_payment_id text unique,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null,
  receipt_url text,
  card_brand text,
  last_4 text,
  failure_message text,
  created_at timestamptz not null default now()
);

create index if not exists registrations_created_at_idx on public.registrations(created_at desc);
create index if not exists registrations_payment_status_idx on public.registrations(payment_status);
create index if not exists registrations_guardian_email_idx on public.registrations(lower(guardian_email));
create index if not exists registration_students_registration_id_idx on public.registration_students(registration_id);
create index if not exists registration_fee_lines_registration_id_idx on public.registration_fee_lines(registration_id);
create index if not exists registration_payments_registration_id_idx on public.registration_payments(registration_id);

create or replace function public.registration_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registration_settings_touch on public.registration_settings;
create trigger registration_settings_touch before update on public.registration_settings
for each row execute function public.registration_touch_updated_at();

drop trigger if exists registration_fees_touch on public.registration_fees;
create trigger registration_fees_touch before update on public.registration_fees
for each row execute function public.registration_touch_updated_at();

drop trigger if exists registrations_touch on public.registrations;
create trigger registrations_touch before update on public.registrations
for each row execute function public.registration_touch_updated_at();

alter table public.registration_settings enable row level security;
alter table public.registration_fees enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_students enable row level security;
alter table public.registration_fee_lines enable row level security;
alter table public.registration_payments enable row level security;

-- Admin browser access. Public registration/payment writes are handled only by Vercel server functions using the service role key.
do $$
declare
  t text;
begin
  foreach t in array array['registration_settings','registration_fees','registrations','registration_students','registration_fee_lines','registration_payments']
  loop
    execute format('drop policy if exists "EL Hedaya admin all" on public.%I', t);
    execute format(
      'create policy "EL Hedaya admin all" on public.%I for all to authenticated using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'') with check ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'')',
      t
    );
  end loop;
end $$;

-- No anon table permissions are required. API routes use the service role key.
revoke all on public.registration_settings from anon;
revoke all on public.registration_fees from anon;
revoke all on public.registrations from anon;
revoke all on public.registration_students from anon;
revoke all on public.registration_fee_lines from anon;
revoke all on public.registration_payments from anon;

grant select, insert, update, delete on public.registration_settings to authenticated;
grant select, insert, update, delete on public.registration_fees to authenticated;
grant select, insert, update, delete on public.registrations to authenticated;
grant select, insert, update, delete on public.registration_students to authenticated;
grant select, insert, update, delete on public.registration_fee_lines to authenticated;
grant select, insert, update, delete on public.registration_payments to authenticated;
