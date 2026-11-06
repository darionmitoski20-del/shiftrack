-- ShiftTracks v1 schema: companies (tenants), profiles with roles, projects,
-- time entries with daily approval, correction requests, project chat.

create type public.user_role as enum ('owner', 'manager', 'foreman', 'worker');
create type public.pay_period as enum ('weekly', 'biweekly', 'monthly');
create type public.entry_status as enum ('pending', 'approved', 'rejected');
create type public.request_status as enum ('open', 'accepted', 'declined');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_url text,
  brand_color text not null default '#C2410C',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.user_role not null default 'worker',
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  pay_period public.pay_period not null default 'monthly',
  consent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.profiles (company_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text,
  client text,
  -- ISO weekdays that count as the project's work week (1 = Monday).
  work_days smallint[] not null default '{1,2,3,4,5}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.projects (company_id);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);
create index on public.project_members (user_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 0 check (break_minutes between 0 and 600),
  note text,
  status public.entry_status not null default 'pending',
  manager_comment text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Worked minutes; shifts that end before they start are treated as crossing midnight.
  minutes int generated always as (
    greatest(0,
      ((extract(epoch from (end_time - start_time))::int / 60 + 1440) % 1440) - break_minutes)
  ) stored,
  check (start_time <> end_time)
);
create index on public.time_entries (company_id, status, work_date);
create index on public.time_entries (user_id, work_date);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entry_id uuid not null references public.time_entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 0 check (break_minutes between 0 and 600),
  reason text not null,
  status public.request_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  attachment_url text,
  created_at timestamptz not null default now()
);
create index on public.messages (project_id, created_at);

-- Helpers (security definer so RLS policies can read the caller's own profile).
create or replace function public.my_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('owner', 'manager'), false)
$$;

create or replace function public.is_project_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = p and user_id = auth.uid())
$$;

-- New auth user -> profile row (no company yet).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owner onboarding: create a company and become its owner.
create or replace function public.create_company(company_name text, owner_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select company_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'already in a company';
  end if;
  insert into public.companies (name) values (company_name) returning id into cid;
  update public.profiles
     set company_id = cid, role = 'owner', full_name = owner_name, consent_at = now()
   where id = auth.uid();
  return cid;
end $$;

-- Workers may only change a few columns on their own profile.
-- Not security definer on purpose: current_user is the caller's role, so changes made
-- by trusted definer functions (e.g. create_company) or the service role pass through.
create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.company_id is distinct from old.company_id then raise exception 'not allowed'; end if;
  -- Only the owner changes roles, and nobody can make another owner through the API.
  if new.role is distinct from old.role
     and (coalesce(public.my_role() <> 'owner', true) or new.role = 'owner' or old.role = 'owner') then
    raise exception 'not allowed';
  end if;
  if public.is_manager() then return new; end if;
  if new.hourly_rate is distinct from old.hourly_rate
     or new.pay_period is distinct from old.pay_period
     or new.active is distinct from old.active then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Workers may only edit pending entries' times, and never their status.
create or replace function public.guard_entry_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.is_manager() then
    if new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    return new;
  end if;
  if old.status <> 'pending'
     or new.status is distinct from old.status
     or new.user_id is distinct from old.user_id
     or new.company_id is distinct from old.company_id
     or new.manager_comment is distinct from old.manager_comment then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create trigger time_entries_guard before update on public.time_entries
  for each row execute function public.guard_entry_update();

-- Row level security.
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.time_entries enable row level security;
alter table public.correction_requests enable row level security;
alter table public.messages enable row level security;

create policy "read own company" on public.companies for select
  using (id = public.my_company_id());
create policy "owner updates company" on public.companies for update
  using (id = public.my_company_id() and public.my_role() = 'owner');

create policy "read profiles in company" on public.profiles for select
  using (id = auth.uid() or company_id = public.my_company_id());
create policy "update own profile" on public.profiles for update
  using (id = auth.uid());
create policy "managers update company profiles" on public.profiles for update
  using (public.is_manager() and company_id = public.my_company_id());

create policy "read company projects" on public.projects for select
  using (company_id = public.my_company_id());
create policy "managers write projects" on public.projects for all
  using (public.is_manager() and company_id = public.my_company_id())
  with check (public.is_manager() and company_id = public.my_company_id());

create policy "read memberships" on public.project_members for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.company_id = public.my_company_id()));
create policy "managers write memberships" on public.project_members for all
  using (public.is_manager() and exists (select 1 from public.projects p where p.id = project_id and p.company_id = public.my_company_id()))
  with check (public.is_manager() and exists (select 1 from public.projects p where p.id = project_id and p.company_id = public.my_company_id()));

create policy "read entries" on public.time_entries for select
  using (user_id = auth.uid() or (public.is_manager() and company_id = public.my_company_id()));
create policy "insert own entries" on public.time_entries for insert
  with check (user_id = auth.uid() and company_id = public.my_company_id()
              and status = 'pending' and public.is_project_member(project_id));
create policy "update entries" on public.time_entries for update
  using (user_id = auth.uid() or (public.is_manager() and company_id = public.my_company_id()));
create policy "delete own pending entries" on public.time_entries for delete
  using (user_id = auth.uid() and status = 'pending');

create policy "read corrections" on public.correction_requests for select
  using (user_id = auth.uid() or (public.is_manager() and company_id = public.my_company_id()));
create policy "insert own corrections" on public.correction_requests for insert
  with check (user_id = auth.uid() and company_id = public.my_company_id()
              and exists (select 1 from public.time_entries e where e.id = entry_id and e.user_id = auth.uid()));
create policy "managers update corrections" on public.correction_requests for update
  using (public.is_manager() and company_id = public.my_company_id());

create policy "read project chat" on public.messages for select
  using (company_id = public.my_company_id() and (public.is_manager() or public.is_project_member(project_id)));
create policy "post to project chat" on public.messages for insert
  with check (sender_id = auth.uid() and company_id = public.my_company_id()
              and (public.is_manager() or public.is_project_member(project_id)));

-- Realtime for chat and approvals.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.time_entries;
  end if;
end $$;
