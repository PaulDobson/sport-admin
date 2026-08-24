create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'instructor', 'assistant')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id), unique (tenant_id, id)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(trim(name)) > 0), address text,
  created_at timestamptz not null default now(), unique (tenant_id, id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0), photo_url text,
  birth_date date, status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(), unique (tenant_id, id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null, starts_at timestamptz not null, ends_at timestamptz not null,
  created_at timestamptz not null default now(), check (ends_at > starts_at), unique (tenant_id, id),
  foreign key (tenant_id, location_id) references public.locations(tenant_id, id) on delete restrict
);

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null, student_id uuid not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  created_at timestamptz not null default now(), unique (tenant_id, session_id, student_id),
  foreign key (tenant_id, session_id) references public.sessions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id) references public.students(tenant_id, id) on delete cascade
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(trim(name)) > 0), price numeric(12, 2) not null check (price >= 0),
  duration_days integer not null check (duration_days > 0),
  created_at timestamptz not null default now(), unique (tenant_id, id)
);

create table if not exists public.student_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null, plan_id uuid not null, starts_at date not null, expires_at date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(), check (expires_at >= starts_at),
  foreign key (tenant_id, student_id) references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, plan_id) references public.membership_plans(tenant_id, id) on delete restrict
);

create or replace function public.current_tenant_ids()
returns uuid[] language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(tenant_id), '{}'::uuid[])
  from public.tenant_memberships
  where user_id = auth.uid() and status = 'active';
$$;

revoke all on function public.current_tenant_ids() from public;
grant execute on function public.current_tenant_ids() to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.locations enable row level security;
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.session_attendance enable row level security;
alter table public.membership_plans enable row level security;
alter table public.student_memberships enable row level security;

drop policy if exists tenants_select on public.tenants;
drop policy if exists tenants_insert on public.tenants;
drop policy if exists tenants_update on public.tenants;
drop policy if exists tenants_delete on public.tenants;
create policy tenants_select on public.tenants for select
  using (id = any (public.current_tenant_ids()));
create policy tenants_insert on public.tenants for insert
  with check (auth.uid() is not null);
create policy tenants_update on public.tenants for update
  using (id = any (public.current_tenant_ids())) with check (id = any (public.current_tenant_ids()));
create policy tenants_delete on public.tenants for delete
  using (id = any (public.current_tenant_ids()));

drop policy if exists tenant_memberships_select on public.tenant_memberships;
drop policy if exists tenant_memberships_insert on public.tenant_memberships;
drop policy if exists tenant_memberships_update on public.tenant_memberships;
drop policy if exists tenant_memberships_delete on public.tenant_memberships;
create policy tenant_memberships_select on public.tenant_memberships for select
  using (user_id = auth.uid() or tenant_id = any (public.current_tenant_ids()));
create policy tenant_memberships_insert on public.tenant_memberships for insert
  with check (user_id = auth.uid() and tenant_id = any (public.current_tenant_ids()));
create policy tenant_memberships_update on public.tenant_memberships for update
  using (user_id = auth.uid() or tenant_id = any (public.current_tenant_ids()))
  with check (user_id = auth.uid() or tenant_id = any (public.current_tenant_ids()));
create policy tenant_memberships_delete on public.tenant_memberships for delete
  using (user_id = auth.uid() or tenant_id = any (public.current_tenant_ids()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['locations', 'students', 'sessions', 'session_attendance', 'membership_plans', 'student_memberships'] loop
    execute format('drop policy if exists %I_select on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete on public.%I', table_name, table_name);
    execute format('create policy %I_select on public.%I for select using (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert with check (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_update on public.%I for update using (tenant_id = any (public.current_tenant_ids())) with check (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete using (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
  end loop;
end;
$$;