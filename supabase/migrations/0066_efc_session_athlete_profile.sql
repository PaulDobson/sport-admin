-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0066: EFC session loads, session sRPE, and athlete profile tables
--
-- Introduces three tables that complement the macrocycle/microcycle schema
-- created in migration 0065:
--
--   efc_session_loads   — planned load matrix per microcycle (category × day)
--   efc_session_srpe    — post-session sRPE records per athlete per day
--   efc_athlete_profile — EFC-specific biometric profile per athlete
--
-- RLS follows the uniform tenant-scoping pattern used across the codebase
-- (tenant_id = any(public.current_tenant_ids())).
-- efc_session_loads carries a denormalized tenant_id to support direct RLS
-- without requiring a join through the microcycle → macrocycle chain.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── efc_session_loads ───────────────────────────────────────────────────────

create table if not exists public.efc_session_loads (
  id            uuid        primary key default gen_random_uuid(),
  microcycle_id uuid        not null references public.efc_microcycles(id) on delete cascade,
  tenant_id     uuid        not null,
  day_of_week   smallint    not null check (day_of_week between 1 and 7),
  category      text        not null check (char_length(category) <= 100),
  subcategory   text        not null check (char_length(subcategory) <= 100),
  minutes       smallint    not null default 0 check (minutes between 0 and 480),
  notes         text        check (notes is null or char_length(notes) <= 500),
  created_at    timestamptz not null default now()
);

create index if not exists efc_session_loads_microcycle_day_idx
  on public.efc_session_loads (microcycle_id, day_of_week);

-- ── RLS: efc_session_loads ────────────────────────────────────────────────────

alter table public.efc_session_loads enable row level security;

drop policy if exists efc_session_loads_select on public.efc_session_loads;
drop policy if exists efc_session_loads_insert on public.efc_session_loads;
drop policy if exists efc_session_loads_update on public.efc_session_loads;
drop policy if exists efc_session_loads_delete on public.efc_session_loads;

create policy efc_session_loads_select on public.efc_session_loads
  for select
  using (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_loads_insert on public.efc_session_loads
  for insert
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_loads_update on public.efc_session_loads
  for update
  using  (tenant_id = any (public.current_tenant_ids()))
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_loads_delete on public.efc_session_loads
  for delete
  using (tenant_id = any (public.current_tenant_ids()));

-- ─── efc_session_srpe ────────────────────────────────────────────────────────

create table if not exists public.efc_session_srpe (
  id               uuid        primary key default gen_random_uuid(),
  microcycle_id    uuid        not null references public.efc_microcycles(id) on delete cascade,
  athlete_id       uuid        not null,
  tenant_id        uuid        not null,
  day_of_week      smallint    not null check (day_of_week between 1 and 7),
  rpe              smallint    not null check (rpe between 1 and 10),
  duration_minutes smallint    not null check (duration_minutes between 1 and 480),
  srpe             integer     not null generated always as (rpe * duration_minutes) stored,
  created_at       timestamptz not null default now(),
  constraint efc_session_srpe_unique_day unique (microcycle_id, athlete_id, day_of_week),
  foreign key (tenant_id, athlete_id) references public.students(tenant_id, id) on delete cascade
);

create index if not exists efc_session_srpe_microcycle_athlete_idx
  on public.efc_session_srpe (microcycle_id, athlete_id);

-- ── RLS: efc_session_srpe ─────────────────────────────────────────────────────

alter table public.efc_session_srpe enable row level security;

drop policy if exists efc_session_srpe_select on public.efc_session_srpe;
drop policy if exists efc_session_srpe_insert on public.efc_session_srpe;
drop policy if exists efc_session_srpe_update on public.efc_session_srpe;
drop policy if exists efc_session_srpe_delete on public.efc_session_srpe;

create policy efc_session_srpe_select on public.efc_session_srpe
  for select
  using (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_srpe_insert on public.efc_session_srpe
  for insert
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_srpe_update on public.efc_session_srpe
  for update
  using  (tenant_id = any (public.current_tenant_ids()))
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_session_srpe_delete on public.efc_session_srpe
  for delete
  using (tenant_id = any (public.current_tenant_ids()));

-- ─── efc_athlete_profile ─────────────────────────────────────────────────────

create table if not exists public.efc_athlete_profile (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null,
  tenant_id   uuid        not null,
  fc_rest     smallint    check (fc_rest is null or fc_rest between 20 and 220),
  is_smoker   boolean     not null default false,
  efc_period  text        not null default 'E' check (efc_period in ('E', 'F', 'C')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint efc_athlete_profile_athlete_unique unique (athlete_id),
  foreign key (tenant_id, athlete_id) references public.students(tenant_id, id) on delete cascade
);

create index if not exists efc_athlete_profile_athlete_tenant_idx
  on public.efc_athlete_profile (athlete_id, tenant_id);

-- ── updated_at trigger: efc_athlete_profile ───────────────────────────────────
-- Reuses the shared set_updated_at() function already present in the schema.

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname   = 'efc_athlete_profile_updated_at'
      and tgrelid  = 'public.efc_athlete_profile'::regclass
  ) then
    create trigger efc_athlete_profile_updated_at
      before update on public.efc_athlete_profile
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ── RLS: efc_athlete_profile ──────────────────────────────────────────────────

alter table public.efc_athlete_profile enable row level security;

drop policy if exists efc_athlete_profile_select on public.efc_athlete_profile;
drop policy if exists efc_athlete_profile_insert on public.efc_athlete_profile;
drop policy if exists efc_athlete_profile_update on public.efc_athlete_profile;
drop policy if exists efc_athlete_profile_delete on public.efc_athlete_profile;

create policy efc_athlete_profile_select on public.efc_athlete_profile
  for select
  using (tenant_id = any (public.current_tenant_ids()));

create policy efc_athlete_profile_insert on public.efc_athlete_profile
  for insert
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_athlete_profile_update on public.efc_athlete_profile
  for update
  using  (tenant_id = any (public.current_tenant_ids()))
  with check (tenant_id = any (public.current_tenant_ids()));

create policy efc_athlete_profile_delete on public.efc_athlete_profile
  for delete
  using (tenant_id = any (public.current_tenant_ids()));
