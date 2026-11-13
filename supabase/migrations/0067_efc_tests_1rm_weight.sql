-- Stage 67: EFC physical tests, 1RM records, and weight control tables.
--
-- Creates three tables for the EFC Training Module (bounded context efc-training):
--
--   • efc_athlete_tests    — periodic physical fitness tests per athlete
--                            (abs, seat-and-reach, pull-ups, push-ups, sprint,
--                             waist circumference, Cooper endurance test)
--   • efc_1rm_records      — 1-repetition-maximum estimations per exercise,
--                            storing Epley, Brzycki, and averaged values
--   • efc_weight_control   — daily weight log for pre-competition weight management
--
-- RLS uses can_manage_metric_definitions(tenant_id) — the same helper introduced
-- in migration 0062 for physical performance tables (not behind the health privacy
-- consent gate, which is reserved for clinical data).

-- ─── 1. efc_athlete_tests ────────────────────────────────────────────────────

create table if not exists public.efc_athlete_tests (
  id                uuid        primary key default gen_random_uuid(),
  athlete_id        uuid        not null references public.students(id) on delete cascade,
  tenant_id         uuid        not null,
  evaluation_date   date        not null,
  abs_1min          smallint    check (abs_1min between 0 and 300),
  seat_and_reach_cm numeric(4,1) check (seat_and_reach_cm between -30.0 and 50.0),
  pull_ups          smallint    check (pull_ups between 0 and 100),
  push_ups_1min     smallint    check (push_ups_1min between 0 and 300),
  sprint_10x5_sec   numeric(5,1) check (sprint_10x5_sec between 0.1 and 120.0),
  waist_cm          numeric(5,1) check (waist_cm between 40.0 and 200.0),
  endurance_meters  integer     check (endurance_meters between 100 and 10000),
  created_at        timestamptz not null default now()
);

create index if not exists efc_athlete_tests_athlete_tenant_date_idx
  on public.efc_athlete_tests (athlete_id, tenant_id, evaluation_date desc);

-- ─── 2. efc_1rm_records ──────────────────────────────────────────────────────

create table if not exists public.efc_1rm_records (
  id               uuid         primary key default gen_random_uuid(),
  athlete_id       uuid         not null references public.students(id) on delete cascade,
  tenant_id        uuid         not null,
  exercise         text         not null check (char_length(exercise) <= 150),
  evaluation_date  date         not null default current_date,
  weight_kg        numeric(6,2) not null check (weight_kg between 0.5 and 500.0),
  reps_performed   smallint     not null check (reps_performed between 1 and 30),
  rir              smallint     not null default 0 check (rir between 0 and 5),
  one_rm_epley     numeric(7,2) not null check (one_rm_epley between 0.5 and 1000.0),
  one_rm_brzycki   numeric(7,2) not null check (one_rm_brzycki between 0.5 and 1000.0),
  one_rm_average   numeric(7,2) not null check (one_rm_average between 0.5 and 1000.0),
  created_at       timestamptz  not null default now()
);

create index if not exists efc_1rm_records_athlete_tenant_exercise_date_idx
  on public.efc_1rm_records (athlete_id, tenant_id, exercise, evaluation_date desc);

-- ─── 3. efc_weight_control ───────────────────────────────────────────────────

create table if not exists public.efc_weight_control (
  id                uuid         primary key default gen_random_uuid(),
  athlete_id        uuid         not null references public.students(id) on delete cascade,
  tenant_id         uuid         not null,
  record_date       date         not null default current_date,
  weight_kg         numeric(5,1) not null check (weight_kg between 30.0 and 200.0),
  category_name     text         not null check (char_length(category_name) <= 50),
  category_limit_kg numeric(5,1) not null check (category_limit_kg between 20.0 and 150.0),
  created_at        timestamptz  not null default now(),
  constraint efc_weight_control_athlete_date_key unique (athlete_id, record_date)
);

create index if not exists efc_weight_control_athlete_tenant_date_idx
  on public.efc_weight_control (athlete_id, tenant_id, record_date desc);

-- ─── 4. RLS — efc_athlete_tests ──────────────────────────────────────────────

alter table public.efc_athlete_tests enable row level security;

drop policy if exists efc_athlete_tests_select on public.efc_athlete_tests;
create policy efc_athlete_tests_select
  on public.efc_athlete_tests for select
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_athlete_tests_insert on public.efc_athlete_tests;
create policy efc_athlete_tests_insert
  on public.efc_athlete_tests for insert
  with check (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_athlete_tests_update on public.efc_athlete_tests;
create policy efc_athlete_tests_update
  on public.efc_athlete_tests for update
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_athlete_tests_delete on public.efc_athlete_tests;
create policy efc_athlete_tests_delete
  on public.efc_athlete_tests for delete
  using (public.can_manage_metric_definitions(tenant_id));

-- ─── 5. RLS — efc_1rm_records ────────────────────────────────────────────────

alter table public.efc_1rm_records enable row level security;

drop policy if exists efc_1rm_records_select on public.efc_1rm_records;
create policy efc_1rm_records_select
  on public.efc_1rm_records for select
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_1rm_records_insert on public.efc_1rm_records;
create policy efc_1rm_records_insert
  on public.efc_1rm_records for insert
  with check (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_1rm_records_update on public.efc_1rm_records;
create policy efc_1rm_records_update
  on public.efc_1rm_records for update
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_1rm_records_delete on public.efc_1rm_records;
create policy efc_1rm_records_delete
  on public.efc_1rm_records for delete
  using (public.can_manage_metric_definitions(tenant_id));

-- ─── 6. RLS — efc_weight_control ─────────────────────────────────────────────

alter table public.efc_weight_control enable row level security;

drop policy if exists efc_weight_control_select on public.efc_weight_control;
create policy efc_weight_control_select
  on public.efc_weight_control for select
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_weight_control_insert on public.efc_weight_control;
create policy efc_weight_control_insert
  on public.efc_weight_control for insert
  with check (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_weight_control_update on public.efc_weight_control;
create policy efc_weight_control_update
  on public.efc_weight_control for update
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists efc_weight_control_delete on public.efc_weight_control;
create policy efc_weight_control_delete
  on public.efc_weight_control for delete
  using (public.can_manage_metric_definitions(tenant_id));
