-- Stage 62: Fix RLS policies for metric_definitions and metric_evaluations.
--
-- Problem: both tables used can_access_student_health(), which requires BOTH a
-- valid membership role AND an approved health privacy policy for the tenant.
-- That gate is appropriate for clinical health data (conditions, injuries,
-- restrictions) but is too restrictive for physical performance metrics:
--
--   • metric_definitions  — tenant-level configuration, no patient data.
--   • metric_evaluations  — physical performance records (strength, speed,
--                           body composition) shown in the "Evolución" section
--                           which is intentionally not behind the consent gate.
--
-- The privacy-policy gate remains on health_conditions, injuries, restrictions,
-- health_consent_events, and other genuinely sensitive clinical tables.
--
-- Fix: introduce can_manage_metric_definitions() that only checks membership
-- role (owner / admin / instructor), and update ALL policies on both
-- metric_definitions and metric_evaluations to use it.

-- ─── 1. Helper: can the caller manage metrics for a tenant? ──────────────────
-- Requires active membership with owner / admin / instructor role.
-- Does NOT require an approved health privacy policy.
create or replace function public.can_manage_metric_definitions(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.current_membership_role(target_tenant) in ('owner', 'admin', 'instructor'),
    false
  );
$$;

revoke all on function public.can_manage_metric_definitions(uuid) from public;
grant execute on function public.can_manage_metric_definitions(uuid) to authenticated;

-- ─── 2. metric_definitions policies ─────────────────────────────────────────

drop policy if exists "metric_definitions_select" on public.metric_definitions;
create policy "metric_definitions_select"
  on public.metric_definitions for select
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists "metric_definitions_insert" on public.metric_definitions;
create policy "metric_definitions_insert"
  on public.metric_definitions for insert
  with check (public.can_manage_metric_definitions(tenant_id));

drop policy if exists "metric_definitions_update" on public.metric_definitions;
create policy "metric_definitions_update"
  on public.metric_definitions for update
  using (public.can_manage_metric_definitions(tenant_id));

-- ─── 3. metric_evaluations policies ─────────────────────────────────────────

drop policy if exists "metric_evaluations_select" on public.metric_evaluations;
create policy "metric_evaluations_select"
  on public.metric_evaluations for select
  using (public.can_manage_metric_definitions(tenant_id));

drop policy if exists "metric_evaluations_insert" on public.metric_evaluations;
create policy "metric_evaluations_insert"
  on public.metric_evaluations for insert
  with check (public.can_manage_metric_definitions(tenant_id));

drop policy if exists "metric_evaluations_update" on public.metric_evaluations;
create policy "metric_evaluations_update"
  on public.metric_evaluations for update
  using (public.can_manage_metric_definitions(tenant_id));

-- NOTE: health_conditions, injuries, student_restrictions, health_consent_events,
-- and student_erasure_requests are intentionally untouched. Those tables store
-- genuinely sensitive clinical data and correctly require can_access_student_health().
