-- Stage 2: identity, profiles, account status, platform admins, and audit log.
-- Expands 0001_init.sql; run after it on the same Supabase project.

alter table public.tenants
  add column if not exists status text not null default 'trial'
    check (status in ('pending', 'trial', 'active', 'suspended', 'cancelled'));

alter table public.tenants
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Fix onboarding bootstrap: the original tenants_insert/tenant_memberships_insert policies
-- required the caller to already belong to the tenant, which made it impossible for a new
-- instructor to create their own first tenant and membership. created_by ties a freshly
-- created, still-memberless tenant to the single user allowed to claim its owner membership.
drop policy if exists tenants_insert on public.tenants;
create policy tenants_insert on public.tenants for insert
  with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists tenant_memberships_insert on public.tenant_memberships;
create policy tenant_memberships_insert on public.tenant_memberships for insert
  with check (
    user_id = auth.uid()
    and (
      tenant_id = any (public.current_tenant_ids())
      or (
        not exists (select 1 from public.tenant_memberships m where m.tenant_id = tenant_memberships.tenant_id)
        and exists (select 1 from public.tenants t where t.id = tenant_memberships.tenant_id and t.created_by = auth.uid())
      )
    )
  );

alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships drop constraint if exists tenant_memberships_status_check;
alter table public.tenant_memberships
  add constraint tenant_memberships_role_check check (role in ('owner', 'admin', 'instructor', 'assistant')),
  add constraint tenant_memberships_status_check check (status in ('active', 'invited', 'suspended', 'revoked'));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this migration existed.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

-- Platform (SaaS) administrators: managed out-of-band via the Supabase dashboard or service role,
-- never through an authenticated-role policy, to avoid a bootstrap dependency on itself.
create table if not exists public.platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.platform_admins where id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- Caller's own role/status within a tenant, resolved without recursive RLS lookups (security definer bypasses RLS).
create or replace function public.current_membership_role(target_tenant uuid)
returns text language sql stable security definer set search_path = public
as $$
  select role
  from public.tenant_memberships
  where tenant_id = target_tenant and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

revoke all on function public.current_membership_role(uuid) from public;
grant execute on function public.current_membership_role(uuid) to authenticated;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (length(trim(action)) > 0),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id text not null check (length(trim(entity_id)) > 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_tenant_occurred_at_idx on public.audit_log (tenant_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins for select
  using (public.is_platform_admin());

-- No insert/update/delete policies: audit_log is append-only, and platform_admins is managed via service role only.
drop policy if exists audit_log_select on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_select on public.audit_log for select
  using (tenant_id = any (public.current_tenant_ids()) or public.is_platform_admin());
create policy audit_log_insert on public.audit_log for insert
  with check (
    (tenant_id = any (public.current_tenant_ids()) or public.is_platform_admin())
    and (actor_id is null or actor_id = auth.uid())
  );
