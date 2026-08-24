-- Stage 6: immutable audit trail for privileged SaaS administration access.
-- Run after 0018_saas_financial_dashboard.sql.

create table if not exists public.saas_privileged_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action ~ '^saas\.[a-z0-9_.]+$'),
  reason text not null check (length(trim(reason)) >= 3),
  result text not null check (result in ('succeeded', 'denied', 'failed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists saas_privileged_audit_tenant_date_idx
  on public.saas_privileged_audit_log (tenant_id, occurred_at desc);
create index if not exists saas_privileged_audit_actor_date_idx
  on public.saas_privileged_audit_log (actor_user_id, occurred_at desc);

alter table public.saas_privileged_audit_log enable row level security;
-- No table policies by design: access is limited to security-definer audit RPCs.

create or replace function public.record_saas_privileged_operation(
  target_tenant uuid,
  target_action text,
  operation_reason text,
  operation_result text,
  operation_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  created_audit_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if auth.uid() is null then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if target_action !~ '^saas\.[a-z0-9_.]+$'
    or length(trim(operation_reason)) < 3
    or operation_result not in ('succeeded', 'denied', 'failed')
    or jsonb_typeof(operation_metadata) <> 'object' then
    raise exception 'Invalid privileged audit operation' using errcode = '22023';
  end if;

  insert into public.saas_privileged_audit_log (
    tenant_id, actor_user_id, action, reason, result, metadata
  ) values (
    target_tenant, auth.uid(), target_action, trim(operation_reason),
    operation_result, operation_metadata
  ) returning id into created_audit_id;

  return created_audit_id;
end;
$$;

alter function public.list_saas_tenants()
  rename to list_saas_tenants_unlogged;
alter function public.get_saas_tenant_status_history(uuid)
  rename to get_saas_tenant_status_history_unlogged;
alter function public.transition_saas_tenant_status(uuid, text, text)
  rename to transition_saas_tenant_status_unlogged;
alter function public.list_active_saas_plans()
  rename to list_active_saas_plans_unlogged;
alter function public.get_saas_tenant_entitlements(uuid)
  rename to get_saas_tenant_entitlements_unlogged;
alter function public.schedule_saas_plan_limits(uuid, uuid, uuid, date, text)
  rename to schedule_saas_plan_limits_unlogged;
alter function public.get_saas_financial_dashboard(date)
  rename to get_saas_financial_dashboard_unlogged;

create function public.list_saas_tenants()
returns table (
  id uuid,
  name text,
  status text,
  billing_contact_name text,
  billing_contact_email text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.tenants_read', 'Tenant backoffice access', 'succeeded'
  );
  return query select * from public.list_saas_tenants_unlogged();
end;
$$;

create function public.get_saas_tenant_status_history(target_tenant uuid)
returns table (
  id uuid,
  previous_status text,
  new_status text,
  reason text,
  actor_user_id uuid,
  occurred_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.tenant_status_history_read',
    'Tenant status history access', 'succeeded'
  );
  return query
  select * from public.get_saas_tenant_status_history_unlogged(target_tenant);
end;
$$;

create function public.transition_saas_tenant_status(
  target_tenant uuid,
  target_status text,
  transition_reason text
)
returns public.tenants
language plpgsql security definer set search_path = public
as $$
declare
  transitioned_tenant public.tenants;
begin
  transitioned_tenant := public.transition_saas_tenant_status_unlogged(
    target_tenant, target_status, transition_reason
  );
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.tenant_status_transition', transition_reason,
    'succeeded', jsonb_build_object('new_status', target_status)
  );
  return transitioned_tenant;
end;
$$;

create function public.list_active_saas_plans()
returns table (
  id uuid,
  name text,
  max_students integer,
  max_users integer,
  features jsonb
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.plans_read', 'Plan catalog access', 'succeeded'
  );
  return query select * from public.list_active_saas_plans_unlogged();
end;
$$;

create function public.get_saas_tenant_entitlements(target_tenant uuid)
returns table (
  subscription_id uuid,
  plan_id uuid,
  active_students bigint,
  active_users bigint,
  max_students integer,
  max_users integer,
  features jsonb
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.tenant_entitlements_read',
    'Tenant limits and usage access', 'succeeded'
  );
  return query
  select * from public.get_saas_tenant_entitlements_unlogged(target_tenant);
end;
$$;

create function public.schedule_saas_plan_limits(
  target_tenant uuid,
  target_subscription uuid,
  target_plan uuid,
  target_effective_from date,
  change_reason text
)
returns public.saas_limits
language plpgsql security definer set search_path = public
as $$
declare
  created_limits public.saas_limits;
begin
  created_limits := public.schedule_saas_plan_limits_unlogged(
    target_tenant, target_subscription, target_plan,
    target_effective_from, change_reason
  );
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.plan_limits_change', change_reason, 'succeeded',
    jsonb_build_object(
      'limits_id', created_limits.id,
      'subscription_id', target_subscription,
      'plan_id', target_plan,
      'effective_from', target_effective_from
    )
  );
  return created_limits;
end;
$$;

create function public.get_saas_financial_dashboard(target_period date)
returns table (
  currency text,
  mrr numeric,
  arr numeric,
  arpa numeric,
  recurring_tenants bigint,
  churned_tenants bigint,
  churn_rate numeric,
  trials_ended bigint,
  trials_converted bigint,
  trial_conversion_rate numeric,
  collected_net numeric,
  pending_amount numeric,
  past_due_amount numeric,
  past_due_tenants bigint
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.financial_dashboard_read', 'Financial dashboard access',
    'succeeded', jsonb_build_object('period', target_period)
  );
  return query
  select * from public.get_saas_financial_dashboard_unlogged(target_period);
end;
$$;

revoke all on function public.record_saas_privileged_operation(
  uuid, text, text, text, jsonb
) from public;
revoke all on function public.list_saas_tenants_unlogged() from public;
revoke all on function public.list_saas_tenants_unlogged() from authenticated;
revoke all on function public.get_saas_tenant_status_history_unlogged(uuid) from public;
revoke all on function public.get_saas_tenant_status_history_unlogged(uuid) from authenticated;
revoke all on function public.transition_saas_tenant_status_unlogged(uuid, text, text) from public;
revoke all on function public.transition_saas_tenant_status_unlogged(uuid, text, text) from authenticated;
revoke all on function public.list_active_saas_plans_unlogged() from public;
revoke all on function public.list_active_saas_plans_unlogged() from authenticated;
revoke all on function public.get_saas_tenant_entitlements_unlogged(uuid) from public;
revoke all on function public.get_saas_tenant_entitlements_unlogged(uuid) from authenticated;
revoke all on function public.schedule_saas_plan_limits_unlogged(
  uuid, uuid, uuid, date, text
) from public;
revoke all on function public.schedule_saas_plan_limits_unlogged(
  uuid, uuid, uuid, date, text
) from authenticated;
revoke all on function public.get_saas_financial_dashboard_unlogged(date) from public;
revoke all on function public.get_saas_financial_dashboard_unlogged(date)
  from authenticated;

revoke all on function public.list_saas_tenants() from public;
revoke all on function public.get_saas_tenant_status_history(uuid) from public;
revoke all on function public.transition_saas_tenant_status(uuid, text, text)
  from public;
revoke all on function public.list_active_saas_plans() from public;
revoke all on function public.get_saas_tenant_entitlements(uuid) from public;
revoke all on function public.schedule_saas_plan_limits(
  uuid, uuid, uuid, date, text
) from public;
revoke all on function public.get_saas_financial_dashboard(date) from public;
grant execute on function public.list_saas_tenants() to authenticated;
grant execute on function public.get_saas_tenant_status_history(uuid) to authenticated;
grant execute on function public.transition_saas_tenant_status(uuid, text, text)
  to authenticated;
grant execute on function public.list_active_saas_plans() to authenticated;
grant execute on function public.get_saas_tenant_entitlements(uuid) to authenticated;
grant execute on function public.schedule_saas_plan_limits(
  uuid, uuid, uuid, date, text
) to authenticated;
grant execute on function public.get_saas_financial_dashboard(date) to authenticated;