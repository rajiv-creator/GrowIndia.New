
-- GrowIndia Jobs - Database & RLS

-- Companies (you already created earlier; safe to re-run)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.companies enable row level security;

drop policy if exists companies_select_own on public.companies;
drop policy if exists companies_insert_own on public.companies;
drop policy if exists companies_update_own on public.companies;
drop policy if exists companies_delete_own on public.companies;
drop policy if exists companies_select_admins_all on public.companies;

create policy companies_select_own
on public.companies for select to authenticated
using (owner_id = auth.uid());

create policy companies_insert_own
on public.companies for insert to authenticated
with check (owner_id = auth.uid());

create policy companies_update_own
on public.companies for update to authenticated
using (owner_id = auth.uid());

create policy companies_delete_own
on public.companies for delete to authenticated
using (owner_id = auth.uid());

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create policy companies_select_admins_all
on public.companies for select to authenticated
using (
  owner_id = auth.uid()
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  type text,
  remote boolean default false,
  min_salary numeric, max_salary numeric, currency text,
  published boolean default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;

drop policy if exists jobs_select_public on public.jobs;
drop policy if exists jobs_select_owner on public.jobs;
drop policy if exists jobs_insert_owner on public.jobs;
drop policy if exists jobs_update_owner on public.jobs;
drop policy if exists jobs_delete_owner on public.jobs;
drop policy if exists jobs_admin_read_all on public.jobs;

-- Public can read published jobs
create policy jobs_select_public
on public.jobs for select to anon, authenticated
using (published = true);

-- Owners can read their own (and drafts)
create policy jobs_select_owner
on public.jobs for select to authenticated
using (created_by = auth.uid() or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

-- Owners can insert (only for their companies)
create policy jobs_insert_owner
on public.jobs for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);

-- Owners can update/delete their jobs
create policy jobs_update_owner
on public.jobs for update to authenticated
using (
  created_by = auth.uid()
  or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);

create policy jobs_delete_owner
on public.jobs for delete to authenticated
using (
  created_by = auth.uid()
  or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);

-- Admins can read all jobs
create policy jobs_admin_read_all
on public.jobs for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Applications (public can submit)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_name text not null,
  candidate_email text not null,
  message text,
  created_at timestamptz not null default now()
);
alter table public.applications enable row level security;

drop policy if exists apps_insert_anon on public.applications;
drop policy if exists apps_insert_auth on public.applications;
drop policy if exists apps_select_owner_admin on public.applications;

-- anyone can submit
create policy apps_insert_anon
on public.applications for insert to anon
with check (true);

create policy apps_insert_auth
on public.applications for insert to authenticated
with check (true);

-- employers/admins can view applications for their jobs
create policy apps_select_owner_admin
on public.applications for select to authenticated
using (
  exists (
    select 1 from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = applications.job_id
      and (j.created_by = auth.uid() or c.owner_id = auth.uid()
           or exists (select 1 from public.admins a where a.user_id = auth.uid()))
  )
);
