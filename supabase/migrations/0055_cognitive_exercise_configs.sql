-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0055: Cognitive Exercise Configurations
--
-- Stores the instructor-defined cognitive exercise configs per tenant.
-- The full configuration is stored as JSONB so the schema stays flexible as
-- new stimulus types (images, sounds) or config fields are added without
-- requiring further migrations.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.cognitive_exercise_configs (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  config      jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for listing exercises per tenant (ordered by updated_at desc)
create index if not exists cognitive_exercise_configs_tenant_updated_idx
  on public.cognitive_exercise_configs (tenant_id, updated_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.cognitive_exercise_configs enable row level security;

-- Instructors (operational members) can read their own tenant's exercises
create policy "Tenant members can read cognitive exercises"
  on public.cognitive_exercise_configs
  for select
  using (
    exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = cognitive_exercise_configs.tenant_id
        and tm.user_id   = auth.uid()
        and tm.status    = 'active'
    )
  );

-- Instructors can insert exercises for their own tenant
create policy "Tenant members can insert cognitive exercises"
  on public.cognitive_exercise_configs
  for insert
  with check (
    exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = cognitive_exercise_configs.tenant_id
        and tm.user_id   = auth.uid()
        and tm.status    = 'active'
    )
  );

-- Instructors can update their tenant's exercises
create policy "Tenant members can update cognitive exercises"
  on public.cognitive_exercise_configs
  for update
  using (
    exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = cognitive_exercise_configs.tenant_id
        and tm.user_id   = auth.uid()
        and tm.status    = 'active'
    )
  );

-- Instructors can delete their tenant's exercises
create policy "Tenant members can delete cognitive exercises"
  on public.cognitive_exercise_configs
  for delete
  using (
    exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = cognitive_exercise_configs.tenant_id
        and tm.user_id   = auth.uid()
        and tm.status    = 'active'
    )
  );

-- ── updated_at trigger ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Only create the trigger if it doesn't already exist for this table
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'cognitive_exercise_configs_updated_at'
      and tgrelid = 'public.cognitive_exercise_configs'::regclass
  ) then
    create trigger cognitive_exercise_configs_updated_at
      before update on public.cognitive_exercise_configs
      for each row execute function public.set_updated_at();
  end if;
end;
$$;
