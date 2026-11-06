-- Pay rates move out of profiles: every company member can read profiles,
-- but only managers (and the person themselves) may see a rate.

create table public.pay_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  pay_period public.pay_period not null default 'monthly'
);
create index on public.pay_settings (company_id);

insert into public.pay_settings (user_id, company_id, hourly_rate, pay_period)
select id, company_id, hourly_rate, pay_period from public.profiles where company_id is not null;

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
  if new.active is distinct from old.active then raise exception 'not allowed'; end if;
  return new;
end $$;

alter table public.profiles drop column hourly_rate, drop column pay_period;

alter table public.pay_settings enable row level security;

create policy "read own or managed pay" on public.pay_settings for select
  using (user_id = auth.uid() or (public.is_manager() and company_id = public.my_company_id()));
create policy "managers write pay" on public.pay_settings for all
  using (public.is_manager() and company_id = public.my_company_id())
  with check (public.is_manager() and company_id = public.my_company_id()
              and exists (select 1 from public.profiles p where p.id = user_id and p.company_id = public.my_company_id()));
