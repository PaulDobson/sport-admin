-- Run after migrations 0001-0020. Set two real auth user UUIDs below.
begin;

select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.platform_admin', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values (
  'c1000000-0000-4000-8000-000000000001',
  'Audited SaaS Tenant',
  'active'
);
insert into public.tenant_memberships (
  id, tenant_id, user_id, role, status
) values (
  'c1000000-0000-4000-8000-000000000011',
  'c1000000-0000-4000-8000-000000000001',
  current_setting('test.owner')::uuid,
  'owner',
  'active'
);
insert into public.platform_admins (id)
values (current_setting('test.platform_admin')::uuid)
on conflict (id) do nothing;

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle,
  max_students, max_users, features
) values (
  'c1000000-0000-4000-8000-000000000021',
  'audited-saas-plan',
  'Audited SaaS Plan',
  120,
  'USD',
  'monthly',
  20,
  3,
  '["reports"]'::jsonb
);
insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on,
  current_period_starts_on, current_period_ends_on, next_billing_date,
  price, currency, billing_cycle
) values (
  'c1000000-0000-4000-8000-000000000031',
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000021',
  'active',
  'paid',
  '2026-08-01',
  '2026-08-01',
  '2026-08-31',
  '2026-09-01',
  120,
  'USD',
  'monthly'
);
insert into public.saas_limits (
  tenant_id, subscription_id, plan_id, max_students, max_users,
  features, effective_from
) values (
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000031',
  'c1000000-0000-4000-8000-000000000021',
  20,
  3,
  '["reports"]'::jsonb,
  '2026-08-01'
);
insert into public.saas_invoices (
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, due_on, issued_at, paid_at
) values (
  'c1000000-0000-4000-8000-000000000041',
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000031',
  'AUDIT-USD-001',
  'paid',
  120,
  'USD',
  '2026-08-01',
  '2026-08-31',
  '2026-08-01',
  '2026-08-01 09:00:00+00',
  '2026-08-01 09:05:00+00'
);
insert into public.saas_charges (
  tenant_id, invoice_id, amount, currency, status, operation_id, occurred_at
) values (
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000041',
  120,
  'USD',
  'succeeded',
  'c1000000-0000-4000-8000-000000000042',
  '2026-08-01 09:05:00+00'
);

insert into public.students (id, tenant_id, full_name) values (
  'c1000000-0000-4000-8000-000000000051',
  'c1000000-0000-4000-8000-000000000001',
  'Private Health Student'
);
insert into public.health_conditions (
  id, tenant_id, student_id, name, source, notes
) values (
  'c1000000-0000-4000-8000-000000000052',
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000051',
  'Private condition',
  'self_reported',
  'Never expose this note to platform administrators'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);

do $$
begin
  begin
    perform public.list_saas_tenants();
    raise exception 'tenant owner listed SaaS tenants';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_saas_financial_dashboard('2026-08-01');
    raise exception 'tenant owner read the SaaS financial dashboard';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.list_saas_tenants_unlogged();
    raise exception 'tenant owner bypassed privileged audit wrappers';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.platform_admin'), true);

do $$
declare
  affected integer;
begin
  if not exists (
    select 1 from public.list_saas_tenants()
    where id = 'c1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'platform administrator cannot list the tenant';
  end if;
  if (select count(*) from public.list_active_saas_plans()) < 1 then
    raise exception 'platform administrator cannot list SaaS plans';
  end if;
  if not exists (
    select 1 from public.get_saas_tenant_entitlements(
      'c1000000-0000-4000-8000-000000000001'
    ) where subscription_id = 'c1000000-0000-4000-8000-000000000031'
      and max_students = 20 and max_users = 3
  ) then
    raise exception 'platform administrator cannot read tenant limits';
  end if;
  if not exists (
    select 1 from public.get_saas_financial_dashboard('2026-08-01')
    where currency = 'USD' and collected_net >= 120
  ) then
    raise exception 'platform administrator cannot read SaaS finances';
  end if;

  perform public.transition_saas_tenant_status(
    'c1000000-0000-4000-8000-000000000001',
    'suspended',
    'Payment review required'
  );
  perform public.transition_saas_tenant_status(
    'c1000000-0000-4000-8000-000000000001',
    'active',
    'Payment review completed'
  );
  if (select count(*) from public.get_saas_tenant_status_history(
    'c1000000-0000-4000-8000-000000000001'
  )) <> 2 then
    raise exception 'tenant status history did not preserve both transitions';
  end if;

  if (select count(*) from public.health_conditions) <> 0
    or (select count(*) from public.injuries) <> 0
    or (select count(*) from public.health_restrictions) <> 0
    or (select count(*) from public.sensitive_audit_log) <> 0 then
    raise exception 'platform administrator received sensitive health data';
  end if;
  if public.can_access_student_health(
    'c1000000-0000-4000-8000-000000000001'
  ) or public.can_review_sensitive_audit(
    'c1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'platform administrator received a sensitive health capability';
  end if;
  update public.health_conditions set notes = 'platform administrator change';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'platform administrator updated a health condition';
  end if;
  begin
    perform public.record_sensitive_access(
      'c1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000051',
      'health_condition',
      'c1000000-0000-4000-8000-000000000052'
    );
    raise exception 'platform administrator recorded sensitive health access';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from public.saas_privileged_audit_log) <> 0 then
    raise exception 'platform administrator bypassed privileged audit RLS';
  end if;
  update public.saas_privileged_audit_log set result = 'failed';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'platform administrator modified privileged audit history';
  end if;
end;
$$;

reset role;

do $$
declare
  expected_action text;
begin
  foreach expected_action in array array[
    'saas.tenants_read',
    'saas.plans_read',
    'saas.tenant_entitlements_read',
    'saas.financial_dashboard_read',
    'saas.tenant_status_transition',
    'saas.tenant_status_history_read'
  ] loop
    if not exists (
      select 1 from public.saas_privileged_audit_log audit
      where audit.actor_user_id = current_setting('test.platform_admin')::uuid
        and audit.action = expected_action
        and audit.result = 'succeeded'
        and length(trim(audit.reason)) >= 3
        and audit.occurred_at is not null
    ) then
      raise exception 'missing privileged audit action: %', expected_action;
    end if;
  end loop;

  if (select count(*) from public.saas_privileged_audit_log
    where action = 'saas.tenant_status_transition'
      and tenant_id = 'c1000000-0000-4000-8000-000000000001'
      and reason in ('Payment review required', 'Payment review completed')
      and metadata ->> 'new_status' in ('suspended', 'active')
  ) <> 2 then
    raise exception 'status transition audit lost tenant, reason, or result';
  end if;
  if not exists (
    select 1 from public.saas_privileged_audit_log
    where action = 'saas.financial_dashboard_read'
      and tenant_id is null
      and metadata ->> 'period' = '2026-08-01'
  ) then
    raise exception 'financial access audit lost its global scope or period';
  end if;
  if exists (
    select 1 from public.saas_privileged_audit_log
    where actor_user_id = current_setting('test.owner')::uuid
  ) then
    raise exception 'denied tenant owner created a successful privileged audit';
  end if;
  if not exists (
    select 1 from pg_class table_definition
    join pg_namespace schema_definition
      on schema_definition.oid = table_definition.relnamespace
    where schema_definition.nspname = 'public'
      and table_definition.relname = 'saas_privileged_audit_log'
      and table_definition.relrowsecurity
  ) then
    raise exception 'privileged SaaS audit table is missing RLS';
  end if;
end;
$$;

rollback;