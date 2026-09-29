-- HR foundation template. Review with the client and security reviewer before applying.
-- This migration deliberately grants no access to employee or assignment rows.
-- Add RLS policies only after the role/field/station access matrix is approved.

create extension if not exists pgcrypto;

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role_key text not null,
  created_at timestamptz not null default now()
);

create table public.user_stations (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete restrict,
  primary key (user_id, station_id)
);

-- Confirm employee_number uniqueness and status values against HR's source data.
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  first_name text not null,
  last_name text not null,
  employment_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_number_not_blank check (length(btrim(employee_number)) > 0),
  constraint employees_first_name_not_blank check (length(btrim(first_name)) > 0),
  constraint employees_last_name_not_blank check (length(btrim(last_name)) > 0)
);

create table public.employee_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  station_id uuid not null references public.stations(id) on delete restrict,
  position_title text not null,
  shift_code text,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  constraint assignment_date_order check (ends_on is null or ends_on >= starts_on)
);

create index employee_assignments_employee_dates_idx
  on public.employee_assignments (employee_id, starts_on desc);
create index employee_assignments_station_dates_idx
  on public.employee_assignments (station_id, starts_on desc);

alter table public.stations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_stations enable row level security;
alter table public.employees enable row level security;
alter table public.employee_assignments enable row level security;

-- Public-to-authenticated station names are organizational reference data.
create policy stations_select_authenticated
  on public.stations for select to authenticated using (true);

-- A user may read their own profile and station memberships. No client profile
-- update policy is provided: role changes must use a separately secured flow.
create policy profiles_select_self
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_stations_select_self
  on public.user_stations for select to authenticated
  using (user_id = (select auth.uid()));

-- TODO, before production:
-- 1. Agree role keys and permissions with HR and station commanders.
-- 2. Add narrowly scoped policies for employee list, profile fields, assignments,
--    and each sensitive record category. Current employee policies deny all.
-- 3. Decide whether salary, injury/medical, leave, and administrative-act records
--    require separate tables/views and narrower access than basic employee data.
-- 4. Define trusted account provisioning and role assignment; do not enable self-promotion.
-- 5. Configure private Storage buckets and policies for HR documents.
-- 6. Add audit coverage and test cross-station and restricted-field access.
-- 7. Confirm the authoritative 17-station catalog before inserting station rows.
