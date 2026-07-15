-- Aviate foundation + rostering schema
-- Ground-handling domain: organisations -> stations (airports) -> departments,
-- shift-based workforce with certifications, roster periods -> shifts -> assignments.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type app_role as enum ('admin', 'manager', 'employee');

create type department_kind as enum (
  'ramp',
  'passenger_services',
  'cargo',
  'fueling',
  'lounge',
  'maintenance',
  'admin',
  'other'
);

create type employment_type as enum ('full_time', 'part_time', 'casual');

create type employee_status as enum ('active', 'inactive', 'onboarding');

create type roster_period_status as enum ('draft', 'published', 'locked');

create type shift_assignment_status as enum (
  'assigned',
  'confirmed',
  'declined',
  'completed',
  'no_show'
);

-- ---------------------------------------------------------------------------
-- Foundation
-- ---------------------------------------------------------------------------

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per auth user; org membership + app role live here.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references organisations (id) on delete set null,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role app_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  iata_code text not null,
  icao_code text,
  name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, iata_code)
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  station_id uuid not null references stations (id) on delete cascade,
  name text not null,
  kind department_kind not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, name)
);

-- Employees are workforce records; they may or may not have a login (profile).
create table employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  profile_id uuid references profiles (id) on delete set null,
  employee_code text not null,
  full_name text not null,
  email text,
  phone text,
  station_id uuid references stations (id) on delete set null,
  department_id uuid references departments (id) on delete set null,
  job_title text,
  employment_type employment_type not null default 'full_time',
  status employee_status not null default 'active',
  started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, employee_code)
);

create index employees_station_idx on employees (station_id);
create index employees_department_idx on employees (department_id);

create table certifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  name text not null,
  description text,
  validity_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table employee_certifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  certification_id uuid not null references certifications (id) on delete cascade,
  issued_on date not null,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, certification_id, issued_on)
);

create index employee_certifications_expiry_idx
  on employee_certifications (expires_on);

-- ---------------------------------------------------------------------------
-- Rostering
-- ---------------------------------------------------------------------------

create table roster_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  station_id uuid not null references stations (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status roster_period_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index roster_periods_station_idx on roster_periods (station_id, starts_on);

create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  station_id uuid not null references stations (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  name text not null,
  start_time time not null,
  end_time time not null,
  required_headcount integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, name)
);

-- Times are local to the station's timezone; end_time <= start_time means the
-- shift crosses midnight into the next day.
create table shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  roster_period_id uuid not null references roster_periods (id) on delete cascade,
  station_id uuid not null references stations (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  template_id uuid references shift_templates (id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  required_headcount integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shifts_period_date_idx on shifts (roster_period_id, shift_date);
create index shifts_station_date_idx on shifts (station_id, shift_date);

create table shift_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  shift_id uuid not null references shifts (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  status shift_assignment_status not null default 'assigned',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, employee_id)
);

create index shift_assignments_employee_idx on shift_assignments (employee_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organisations', 'profiles', 'stations', 'departments', 'employees',
    'certifications', 'employee_certifications', 'roster_periods',
    'shift_templates', 'shifts', 'shift_assignments'
  ]
  loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-provision a profile for every new auth user
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = (select auth.uid()) and org_id = target_org
  );
$$;

create or replace function is_org_manager(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = (select auth.uid())
      and org_id = target_org
      and role in ('admin', 'manager')
  );
$$;

alter table organisations enable row level security;
alter table profiles enable row level security;
alter table stations enable row level security;
alter table departments enable row level security;
alter table employees enable row level security;
alter table certifications enable row level security;
alter table employee_certifications enable row level security;
alter table roster_periods enable row level security;
alter table shift_templates enable row level security;
alter table shifts enable row level security;
alter table shift_assignments enable row level security;

create policy "members read own org" on organisations
  for select using (is_org_member(id));

create policy "read own profile" on profiles
  for select using (id = (select auth.uid()));

create policy "read org profiles" on profiles
  for select using (org_id is not null and is_org_member(org_id));

create policy "update own profile" on profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Org-scoped tables: members read, managers write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'stations', 'departments', 'employees', 'certifications',
    'employee_certifications', 'roster_periods', 'shift_templates',
    'shifts', 'shift_assignments'
  ]
  loop
    execute format(
      'create policy "members read" on %I for select using (is_org_member(org_id))', t
    );
    execute format(
      'create policy "managers insert" on %I for insert with check (is_org_manager(org_id))', t
    );
    execute format(
      'create policy "managers update" on %I for update using (is_org_manager(org_id)) with check (is_org_manager(org_id))', t
    );
    execute format(
      'create policy "managers delete" on %I for delete using (is_org_manager(org_id))', t
    );
  end loop;
end;
$$;
