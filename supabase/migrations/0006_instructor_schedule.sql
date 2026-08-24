-- Stage 3: disciplines, class templates, and recurring weekly schedules.

create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name)
);

create table if not exists public.class_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  discipline_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  capacity integer not null check (capacity > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, discipline_id)
    references public.disciplines(tenant_id, id) on delete restrict
);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  class_template_id uuid not null,
  location_id uuid not null,
  instructor_membership_id uuid not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  timezone text not null check (length(trim(timezone)) > 0),
  allow_conflict boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (tenant_id, id),
  foreign key (tenant_id, class_template_id)
    references public.class_templates(tenant_id, id) on delete cascade,
  foreign key (tenant_id, location_id)
    references public.locations(tenant_id, id) on delete restrict,
  foreign key (tenant_id, instructor_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create index if not exists disciplines_tenant_status_idx
  on public.disciplines (tenant_id, status, name);
create index if not exists class_templates_tenant_status_idx
  on public.class_templates (tenant_id, status);
create index if not exists class_schedules_instructor_day_idx
  on public.class_schedules (
    tenant_id,
    instructor_membership_id,
    day_of_week,
    status,
    starts_at,
    ends_at
  );

create or replace function public.prevent_unconfirmed_schedule_conflict()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status = 'active'
    and not new.allow_conflict
    and exists (
      select 1
      from public.class_schedules existing
      where existing.tenant_id = new.tenant_id
        and existing.instructor_membership_id = new.instructor_membership_id
        and existing.day_of_week = new.day_of_week
        and existing.status = 'active'
        and existing.id <> new.id
        and existing.starts_at < new.ends_at
        and new.starts_at < existing.ends_at
    ) then
    raise exception 'schedule conflict requires explicit confirmation'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unconfirmed_schedule_conflict on public.class_schedules;
create trigger prevent_unconfirmed_schedule_conflict
  before insert or update on public.class_schedules
  for each row execute function public.prevent_unconfirmed_schedule_conflict();

alter table public.disciplines enable row level security;
alter table public.class_templates enable row level security;
alter table public.class_schedules enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['disciplines', 'class_templates', 'class_schedules'] loop
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