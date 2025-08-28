
-- Enable extension for UUID generation
create extension if not exists "pgcrypto";

-- Admins
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

-- Helper function to check admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.admins a where a.user_id = uid);
$$;

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.companies enable row level security;

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  type text,
  min_salary text,
  max_salary text,
  currency text,
  description text,
  published boolean not null default true,
  status text default 'open',
  company_id uuid references public.companies(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_name text,
  email text,
  message text,
  created_at timestamptz not null default now()
);
alter table public.applications enable row level security;

-- ---------------- RLS Policies ----------------

-- admins: only admins can read/modify
drop policy if exists admins_all on public.admins;
create policy admins_all on public.admins
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- companies
drop policy if exists companies_select_own on public.companies;
create policy companies_select_own on public.companies
  for select using (owner_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own on public.companies
  for insert with check (owner_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies
  for update using (owner_id = auth.uid() or is_admin(auth.uid()))
  with check (owner_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists companies_delete_own on public.companies;
create policy companies_delete_own on public.companies
  for delete using (owner_id = auth.uid() or is_admin(auth.uid()));

-- jobs
drop policy if exists jobs_public_select on public.jobs;
create policy jobs_public_select on public.jobs
  for select using ( published = true or is_admin(auth.uid()) or created_by = auth.uid() );

drop policy if exists jobs_insert_own on public.jobs;
create policy jobs_insert_own on public.jobs
  for insert with check (
    (created_by = auth.uid() and exists(select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
    or is_admin(auth.uid())
  );

drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs
  for update using (
    (created_by = auth.uid() and exists(select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
    or is_admin(auth.uid())
  )
  with check (
    (created_by = auth.uid() and exists(select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
    or is_admin(auth.uid())
  );

drop policy if exists jobs_delete_own on public.jobs;
create policy jobs_delete_own on public.jobs
  for delete using (
    (created_by = auth.uid() and exists(select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
    or is_admin(auth.uid())
  );

-- applications
drop policy if exists apps_insert_any on public.applications;
create policy apps_insert_any on public.applications
  for insert with check ( true );  -- allow public submissions

drop policy if exists apps_select_employer on public.applications;
create policy apps_select_employer on public.applications
  for select using (
    is_admin(auth.uid()) or
    exists(
      select 1 from public.jobs j
        join public.companies c on c.id = j.company_id
      where j.id = applications.job_id and (j.created_by = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- -------------- Convenience: make yourself admin --------------
-- insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL@EXAMPLE.COM';
