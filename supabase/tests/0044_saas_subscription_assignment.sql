-- Disposable PostgreSQL/Supabase only; requires migrations through 0045.
-- This script is prepared but must be executed before enabling commercial writes.
begin;
set local timezone = 'Pacific/Auckland';

insert into auth.users(id, email) values
  ('ad440000-0000-4000-8000-000000000001', 'assignment-admin@example.invalid'),
  ('ad440000-0000-4000-8000-000000000002', 'assignment-owner@example.invalid');
insert into public.platform_admins(id) values ('ad440000-0000-4000-8000-000000000001');
insert into public.tenants(id, name, status) values
  ('ad440000-0000-4000-8000-000000000011', 'Initial contract', 'pending'),
  ('ad440000-0000-4000-8000-000000000012', 'Trial contract', 'trial'),
  ('ad440000-0000-4000-8000-000000000013', 'Free contract', 'active'),
  ('ad440000-0000-4000-8000-000000000014', 'Stale usage', 'active');

do $$
begin
  if public.saas_period_boundary('2028-01-31', 'months', 1, 1) <> date '2028-02-29'
    or public.saas_period_boundary('2028-01-31', 'months', 1, 2) <> date '2028-03-31'
    or public.saas_period_boundary('2027-01-31', 'months', 1, 1) <> date '2027-02-28'
    or public.saas_period_boundary('2026-09-05', 'days', 2, 1) <> date '2026-09-07' then
    raise exception 'Calendar boundary drifted or used session timezone';
  end if;
  begin
    perform public.saas_period_boundary('9999-12-31', 'days', 1, 1);
    raise exception 'Out-of-range billing period was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ad440000-0000-4000-8000-000000000001', true);
do $$
declare
  terms jsonb := '{
    "name":"Assignment Pro","description":null,"price":11900,"duration_unit":"months",
    "duration_count":1,"trial_days":7,"max_students":100,"max_users":5,
    "features":["reports"],"services":["Capacitacion"]
  }';
  version_id uuid;
  free_version_id uuid;
  quote jsonb;
  saved jsonb;
  business_today date := (now() at time zone 'America/Santiago')::date;
begin
  version_id := (public.publish_saas_plan_version(null, null, gen_random_uuid(), terms, 'Plan de pruebas')->>'version_id')::uuid;
  free_version_id := (public.publish_saas_plan_version(null, null, gen_random_uuid(),
    terms || '{"name":"Gratuito","price":0,"duration_unit":"days","duration_count":30}', 'Plan gratuito')->>'version_id')::uuid;
  perform set_config('test.assignment_version', version_id::text, true);
  quote := public.preview_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000011', version_id, business_today, false, null);
  if (quote->>'initial_amount')::numeric <> 11900 or (quote->>'net')::numeric <> 10000
    or (quote->>'vat')::numeric <> 1900 or (quote->>'business_date')::date <> business_today then
    raise exception 'Initial quote amount, VAT or Chile date is wrong';
  end if;
  saved := public.confirm_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000011', version_id, business_today, false, null,
    quote->>'fingerprint', 'ad440000-0000-4000-8000-000000000021', 'Contrato inicial');
  if public.confirm_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000011', version_id, business_today, false, null,
    quote->>'fingerprint', 'ad440000-0000-4000-8000-000000000021', 'Contrato inicial') <> saved then
    raise exception 'Idempotent assignment changed the result';
  end if;
  perform set_config('test.assignment_subscription', saved->>'subscription_id', true);
  begin
    perform public.confirm_saas_subscription_assignment(
      'ad440000-0000-4000-8000-000000000011', version_id, business_today, false, null,
      quote->>'fingerprint', 'ad440000-0000-4000-8000-000000000021', 'Otro motivo');
    raise exception 'Different payload reused the assignment operation';
  exception when unique_violation then null;
  end;
  begin
    perform public.confirm_saas_subscription_assignment(
      'ad440000-0000-4000-8000-000000000011', version_id, business_today, false, null,
      quote->>'fingerprint', gen_random_uuid(), 'Segunda suscripcion');
    raise exception 'Second current subscription was accepted';
  exception when unique_violation then null;
  end;

  quote := public.preview_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000012', version_id, business_today, true, null);
  if (quote->>'initial_invoice')::boolean or (quote->>'initial_amount')::numeric <> 0
    or (quote->>'trial_end_exclusive')::date <> business_today + 7 then
    raise exception 'Trial generated initial debt or wrong boundary';
  end if;
  saved := public.confirm_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000012', version_id, business_today, true, null,
    quote->>'fingerprint', gen_random_uuid(), 'Prueba explicita');
  if saved->>'invoice_id' is not null or saved->>'status' <> 'trial' then
    raise exception 'Trial created an initial invoice or wrong status';
  end if;

  quote := public.preview_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000013', free_version_id, business_today, false, null);
  saved := public.confirm_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000013', free_version_id, business_today, false, null,
    quote->>'fingerprint', gen_random_uuid(), 'Contrato gratuito');
  if saved->>'invoice_id' is not null or (saved->>'initial_amount')::numeric <> 0 then
    raise exception 'Free contract generated a fictitious invoice';
  end if;
  quote := public.preview_saas_subscription_assignment(
    'ad440000-0000-4000-8000-000000000014', version_id, business_today, false, null);
  perform set_config('test.assignment_stale_quote', quote::text, true);
end;
$$;

reset role;
insert into public.students(tenant_id, full_name) values ('ad440000-0000-4000-8000-000000000014', 'New active student');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ad440000-0000-4000-8000-000000000001', true);
do $$
declare quote jsonb := current_setting('test.assignment_stale_quote')::jsonb;
begin
  begin
    perform public.confirm_saas_subscription_assignment(
      'ad440000-0000-4000-8000-000000000014', current_setting('test.assignment_version')::uuid,
      (quote->>'starts_on')::date, false, null, quote->>'fingerprint', gen_random_uuid(), 'Uso obsoleto');
    raise exception 'Stale usage preview was confirmed';
  exception when serialization_failure then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'ad440000-0000-4000-8000-000000000002', true);
do $$
begin
  begin
    perform public.get_saas_subscription_management('ad440000-0000-4000-8000-000000000011');
    raise exception 'Non-admin read privileged subscription management';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.preview_saas_subscription_assignment(
      'ad440000-0000-4000-8000-000000000014', current_setting('test.assignment_version')::uuid,
      (now() at time zone 'America/Santiago')::date, false, null);
    raise exception 'Non-admin previewed assignment';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
do $$
declare
  subscription public.saas_subscriptions;
begin
  select * into subscription from public.saas_subscriptions
    where id = current_setting('test.assignment_subscription')::uuid;
  if subscription.price <> 11900 or subscription.payment_status <> 'pending'
    or subscription.current_period_end_exclusive <> subscription.current_period_ends_on + 1 then
    raise exception 'Persisted contract differs from preview or inclusive legacy mapping';
  end if;
  if (select status from public.tenants where id = subscription.tenant_id) <> 'pending' then
    raise exception 'Assignment changed the administrative tenant status';
  end if;
  if (select count(*) from public.saas_invoices where subscription_id = subscription.id) <> 1
    or exists (select 1 from public.saas_charges where tenant_id in (
      'ad440000-0000-4000-8000-000000000011','ad440000-0000-4000-8000-000000000012','ad440000-0000-4000-8000-000000000013'
    )) then
    raise exception 'Assignment duplicated invoices or invented payment';
  end if;
  if exists (select 1 from public.saas_subscriptions where tenant_id = 'ad440000-0000-4000-8000-000000000014') then
    raise exception 'Stale confirmation left a partial subscription';
  end if;
  if not exists (select 1 from public.saas_privileged_audit_log
    where action = 'saas.subscription_assigned' and tenant_id = subscription.tenant_id) then
    raise exception 'Assignment audit missing';
  end if;
  if not exists (select 1 from public.saas_subscription_events e
    where e.subscription_id = subscription.id and e.duration_unit = 'months'
      and e.duration_count = 1 and e.plan_version_id = subscription.plan_version_id) then
    raise exception 'Contract event omitted commercial duration/version';
  end if;
end;
$$;
rollback;
