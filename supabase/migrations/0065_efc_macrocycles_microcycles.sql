-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0065: EFC Training Module — macrocycles and microcycles
--
-- Introduces two tables that support the EFC (Estructura–Función–Cognición)
-- periodisation workflow for combat sport athletes:
--
--   • efc_macrocycles  — high-level training block per athlete (start→competition)
--   • efc_microcycles  — weekly breakdown of a macrocycle
--
-- RLS follows the existing current_tenant_ids() helper.
-- updated_at trigger reuses the set_updated_at() function introduced in 0055.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. efc_macrocycles ───────────────────────────────────────────────────────

create table if not exists public.efc_macrocycles (
  id                     uuid        primary key default gen_random_uuid(),
  athlete_id             uuid        not null,
  tenant_id              uuid        not null references public.tenants(id) on delete cascade,
  start_date             date        not null,
  competition_date       date        not null,
  hours_per_session      numeric(4,2) not null
    check (hours_per_session between 0.5 and 8.0),
  training_days_per_week smallint    not null
    check (training_days_per_week between 1 and 7),
  sessions_per_day       smallint    not null default 1
    check (sessions_per_day between 1 and 5),
  e_percentage           smallint    not null default 50
    check (e_percentage between 0 and 100),
  f_percentage           smallint    not null default 30
    check (f_percentage between 0 and 100),
  c_percentage           smallint    not null default 20
    check (c_percentage between 0 and 100),
  justification          text
    check (justification is null or char_length(justification) <= 1000),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (tenant_id, id),
  check (e_percentage + f_percentage + c_percentage = 100),
  check (competition_date > start_date),
  foreign key (tenant_id, athlete_id)
    references public.students(tenant_id, id) on delete restrict
);

-- ─── 2. efc_microcycles ───────────────────────────────────────────────────────

create table if not exists public.efc_microcycles (
  id               uuid     primary key default gen_random_uuid(),
  macrocycle_id    uuid     not null references public.efc_macrocycles(id) on delete cascade,
  week_number      smallint not null
    check (week_number between 1 and 52),
  microcycle_type  text     not null
    check (microcycle_type in ('AJ', 'C', 'I', 'AC', 'CO', 'R')),
  intensity_target smallint not null default 3
    check (intensity_target between 0 and 9),
  objective        text     not null default ''
    check (char_length(objective) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (macrocycle_id, week_number)
);

-- ─── 3. Indexes ───────────────────────────────────────────────────────────────

create index if not exists efc_macrocycles_athlete_tenant_idx
  on public.efc_macrocycles (athlete_id, tenant_id);

create index if not exists efc_microcycles_macrocycle_idx
  on public.efc_microcycles (macrocycle_id);

-- ─── 4. updated_at triggers ───────────────────────────────────────────────────
-- Reuses set_updated_at() introduced in migration 0055.

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'efc_macrocycles_updated_at'
      and tgrelid = 'public.efc_macrocycles'::regclass
  ) then
    create trigger efc_macrocycles_updated_at
      before update on public.efc_macrocycles
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'efc_microcycles_updated_at'
      and tgrelid = 'public.efc_microcycles'::regclass
  ) then
    create trigger efc_microcycles_updated_at
      before update on public.efc_microcycles
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ─── 5. RLS — efc_macrocycles ─────────────────────────────────────────────────

alter table public.efc_macrocycles enable row level security;

drop policy if exists efc_macrocycles_select on public.efc_macrocycles;
create policy efc_macrocycles_select on public.efc_macrocycles for select
  using (tenant_id = any (public.current_tenant_ids()));

drop policy if exists efc_macrocycles_insert on public.efc_macrocycles;
create policy efc_macrocycles_insert on public.efc_macrocycles for insert
  with check (tenant_id = any (public.current_tenant_ids()));

drop policy if exists efc_macrocycles_update on public.efc_macrocycles;
create policy efc_macrocycles_update on public.efc_macrocycles for update
  using (tenant_id = any (public.current_tenant_ids()))
  with check (tenant_id = any (public.current_tenant_ids()));

drop policy if exists efc_macrocycles_delete on public.efc_macrocycles;
create policy efc_macrocycles_delete on public.efc_macrocycles for delete
  using (tenant_id = any (public.current_tenant_ids()));

-- ─── 6. RLS — efc_microcycles ─────────────────────────────────────────────────
-- Microcycles have no tenant_id column; access is derived through the parent
-- macrocycle. A sub-select into efc_macrocycles is used so the same
-- current_tenant_ids() helper governs access consistently.

alter table public.efc_microcycles enable row level security;

drop policy if exists efc_microcycles_select on public.efc_microcycles;
create policy efc_microcycles_select on public.efc_microcycles for select
  using (
    exists (
      select 1 from public.efc_macrocycles m
      where m.id = efc_microcycles.macrocycle_id
        and m.tenant_id = any (public.current_tenant_ids())
    )
  );

drop policy if exists efc_microcycles_insert on public.efc_microcycles;
create policy efc_microcycles_insert on public.efc_microcycles for insert
  with check (
    exists (
      select 1 from public.efc_macrocycles m
      where m.id = efc_microcycles.macrocycle_id
        and m.tenant_id = any (public.current_tenant_ids())
    )
  );

drop policy if exists efc_microcycles_update on public.efc_microcycles;
create policy efc_microcycles_update on public.efc_microcycles for update
  using (
    exists (
      select 1 from public.efc_macrocycles m
      where m.id = efc_microcycles.macrocycle_id
        and m.tenant_id = any (public.current_tenant_ids())
    )
  )
  with check (
    exists (
      select 1 from public.efc_macrocycles m
      where m.id = efc_microcycles.macrocycle_id
        and m.tenant_id = any (public.current_tenant_ids())
    )
  );

drop policy if exists efc_microcycles_delete on public.efc_microcycles;
create policy efc_microcycles_delete on public.efc_microcycles for delete
  using (
    exists (
      select 1 from public.efc_macrocycles m
      where m.id = efc_microcycles.macrocycle_id
        and m.tenant_id = any (public.current_tenant_ids())
    )
  );
