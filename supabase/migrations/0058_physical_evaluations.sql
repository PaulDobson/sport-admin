-- Stage 58: Extend metric_definitions with physical evaluation support.
-- Adds: duration_seconds field to evaluations (for timed rep tests),
--       evaluation_type to metric_definitions ('body_composition' | 'strength' | 'cardio' | 'custom'),
--       and bootstraps tenant-level default metric definitions on tenant creation.
-- The existing tables already handle body composition (weight, fat %, muscle mass)
-- and strength/cardio via their generic value_type. This migration adds:
-- 1. evaluation_type column for better UX categorisation.
-- 2. Seed function for default metric definitions per tenant.
-- 3. RLS policies that were not yet explicit on metric_definitions.

-- ─── 1. Add evaluation_type to metric_definitions ───────────────────────────

alter table public.metric_definitions
  add column if not exists evaluation_type text not null default 'custom'
    check (evaluation_type in ('body_composition', 'strength', 'cardio', 'custom'));

-- ─── 2. Add time_window_seconds for "reps in X seconds" test support ─────────
-- Stored on the metric_definition so the instructor configures it once.
-- Nullable: only applicable to custom rep-count evaluations.
alter table public.metric_definitions
  add column if not exists time_window_seconds integer
    check (time_window_seconds is null or time_window_seconds > 0);

-- ─── 3. RLS on metric_definitions (was missing explicit policies) ────────────

alter table public.metric_definitions enable row level security;
alter table public.metric_evaluations enable row level security;

-- metric_definitions: any membership in the tenant can read; only owner/admin/instructor can write
drop policy if exists "metric_definitions_select" on public.metric_definitions;
create policy "metric_definitions_select"
  on public.metric_definitions for select
  using (public.can_access_student_health(tenant_id));

drop policy if exists "metric_definitions_insert" on public.metric_definitions;
create policy "metric_definitions_insert"
  on public.metric_definitions for insert
  with check (public.can_access_student_health(tenant_id));

drop policy if exists "metric_definitions_update" on public.metric_definitions;
create policy "metric_definitions_update"
  on public.metric_definitions for update
  using (public.can_access_student_health(tenant_id));

-- metric_evaluations: scoped to health-enabled members
drop policy if exists "metric_evaluations_select" on public.metric_evaluations;
create policy "metric_evaluations_select"
  on public.metric_evaluations for select
  using (public.can_access_student_health(tenant_id));

drop policy if exists "metric_evaluations_insert" on public.metric_evaluations;
create policy "metric_evaluations_insert"
  on public.metric_evaluations for insert
  with check (public.can_access_student_health(tenant_id));

-- ─── 4. Seed function for default metric definitions ─────────────────────────
-- Called once per tenant. Safe to re-run (uses ON CONFLICT DO NOTHING).

create or replace function public.seed_default_metric_definitions(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.metric_definitions
    (tenant_id, slug, name, category, value_type, unit, validation_rules, evaluation_type, status)
  values
    -- Body composition
    (p_tenant_id, 'weight-kg',      'Peso corporal',           'Composición corporal', 'numeric',    'kg',  '{"min":1,"max":500}'::jsonb,   'body_composition', 'active'),
    (p_tenant_id, 'body-fat-pct',   '% Grasa corporal',        'Composición corporal', 'percentage', '%',   '{"min":1,"max":60}'::jsonb,    'body_composition', 'active'),
    (p_tenant_id, 'muscle-mass-kg', 'Masa muscular',           'Composición corporal', 'numeric',    'kg',  '{"min":1,"max":200}'::jsonb,   'body_composition', 'active'),
    (p_tenant_id, 'cardio-vo2max',  'Capacidad aeróbica (VO2max)', 'Capacidad cardiorrespiratoria', 'numeric', 'ml/kg/min', '{"min":10,"max":90}'::jsonb, 'cardio', 'active'),
    -- Strength
    (p_tenant_id, 'strength-bench-press', 'Press de banca (1RM)',     'Fuerza', 'numeric', 'kg', '{"min":1,"max":500}'::jsonb, 'strength', 'active'),
    (p_tenant_id, 'strength-squat',       'Sentadilla (1RM)',         'Fuerza', 'numeric', 'kg', '{"min":1,"max":500}'::jsonb, 'strength', 'active'),
    (p_tenant_id, 'strength-deadlift',    'Peso muerto (1RM)',        'Fuerza', 'numeric', 'kg', '{"min":1,"max":500}'::jsonb, 'strength', 'active'),
    -- Speed
    (p_tenant_id, 'speed-40m',    'Velocidad 40 m (seg)',     'Velocidad',  'numeric', 'seg', '{"min":1,"max":30}'::jsonb,  'cardio', 'active'),
    (p_tenant_id, 'speed-100m',   'Velocidad 100 m (seg)',    'Velocidad',  'numeric', 'seg', '{"min":5,"max":60}'::jsonb,  'cardio', 'active')
  on conflict (tenant_id, slug) do nothing;
end;
$$;

revoke all on function public.seed_default_metric_definitions(uuid) from public;
grant execute on function public.seed_default_metric_definitions(uuid) to authenticated;

-- ─── 5. Index for evaluation_type filtering ───────────────────────────────────
create index if not exists metric_definitions_tenant_type_idx
  on public.metric_definitions (tenant_id, evaluation_type, status);
