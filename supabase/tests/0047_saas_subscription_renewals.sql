-- Disposable PostgreSQL/Supabase only, migrations through 0047. Prepared, not executed.
-- This rollback-only script does not replace the separate two-connection concurrency test.
begin;
set local timezone = 'Pacific/Auckland';
insert into auth.users(id, email) values
  ('ad470000-0000-4000-8000-000000000001', 'renewal-admin@example.invalid'),
  ('ad470000-0000-4000-8000-000000000002', 'renewal-owner@example.invalid'),
  ('ad470000-0000-4000-8000-000000000003', 'renewal-tenant-admin@example.invalid');
insert into public.platform_admins(id) values ('ad470000-0000-4000-8000-000000000001');
insert into public.tenants(id, name, status) values
  ('ad470000-0000-4000-8000-000000000011', 'Archived renewal', 'suspended'),
  ('ad470000-0000-4000-8000-000000000012', 'Trial renewal', 'active'),
  ('ad470000-0000-4000-8000-000000000013', 'Blocked downgrade', 'active'),
  ('ad470000-0000-4000-8000-000000000014', 'Free renewal', 'active'),
  ('ad470000-0000-4000-8000-000000000015', 'Rollback and recovery', 'active'),
  ('ad470000-0000-4000-8000-000000000016', 'Applied downgrade', 'active');
insert into public.tenant_memberships(tenant_id, user_id, role) values
  ('ad470000-0000-4000-8000-000000000013','ad470000-0000-4000-8000-000000000002','owner'),
  ('ad470000-0000-4000-8000-000000000013','ad470000-0000-4000-8000-000000000003','admin');
select set_config('request.jwt.claim.sub', 'ad470000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $$
declare
  terms jsonb := '{"name":"Renewal Pro","price":11900,"duration_unit":"days","duration_count":30,
    "trial_days":2,"max_students":100,"max_users":5,"features":["reports"],"services":["Soporte"]}';
  plan jsonb;
  version_id uuid;
  small_version uuid;
  free_version uuid;
  tenant uuid;
  quote jsonb;
  saved jsonb;
  change_quote jsonb;
  today date := (now() at time zone 'America/Santiago')::date;
begin
  plan := public.publish_saas_plan_version(null, null, gen_random_uuid(), terms, 'Plan para renovaciones');
  version_id := (plan->>'version_id')::uuid;
  small_version := (public.publish_saas_plan_version(null, null, gen_random_uuid(),
    terms || '{"name":"Small","price":5000,"max_students":1}', 'Plan menor')->>'version_id')::uuid;
  free_version := (public.publish_saas_plan_version(null, null, gen_random_uuid(),
    terms || '{"name":"Free","price":0}', 'Plan gratuito')->>'version_id')::uuid;
  perform set_config('test.renewal_version', version_id::text, true);
  perform set_config('test.renewal_small_version', small_version::text, true);
  foreach tenant in array array[
    'ad470000-0000-4000-8000-000000000011'::uuid, 'ad470000-0000-4000-8000-000000000012'::uuid,
    'ad470000-0000-4000-8000-000000000013'::uuid, 'ad470000-0000-4000-8000-000000000014'::uuid,
    'ad470000-0000-4000-8000-000000000015'::uuid, 'ad470000-0000-4000-8000-000000000016'::uuid
  ] loop
    quote := public.preview_saas_subscription_assignment(tenant,
      case when tenant = 'ad470000-0000-4000-8000-000000000014' then free_version else version_id end,
      today, tenant = 'ad470000-0000-4000-8000-000000000012', null);
    saved := public.confirm_saas_subscription_assignment(tenant,
      case when tenant = 'ad470000-0000-4000-8000-000000000014' then free_version else version_id end,
      today, tenant = 'ad470000-0000-4000-8000-000000000012', null, quote->>'fingerprint', gen_random_uuid(), 'Contrato para renovacion');
    if tenant in ('ad470000-0000-4000-8000-000000000013', 'ad470000-0000-4000-8000-000000000016') then
      change_quote := public.preview_saas_plan_change(tenant, small_version);
      perform public.confirm_saas_plan_change(tenant, small_version, change_quote->>'fingerprint', gen_random_uuid(), 'Reducir contrato');
    end if;
  end loop;
  perform public.archive_saas_plan((plan->>'plan_id')::uuid, version_id, gen_random_uuid(), 'Oferta archivada');
end;
$$;
reset role;
-- Advance synthetic contracts to today's boundary. Trial anchor is its first payable day.
update public.saas_subscriptions set
  starts_on = (now() at time zone 'America/Santiago')::date - case when status = 'trial' then 2 else 30 end,
  current_period_starts_on = (now() at time zone 'America/Santiago')::date - case when status = 'trial' then 2 else 30 end,
  current_period_ends_on = (now() at time zone 'America/Santiago')::date - 1,
  current_period_end_exclusive = (now() at time zone 'America/Santiago')::date,
  next_billing_date = (now() at time zone 'America/Santiago')::date,
  period_anchor_on = (now() at time zone 'America/Santiago')::date - case when status = 'trial' then 0 else 30 end,
  trial_ends_on = case when status = 'trial' then (now() at time zone 'America/Santiago')::date - 1 else trial_ends_on end,
  first_invoice_due_on = (now() at time zone 'America/Santiago')::date,
  period_index = 0
where tenant_id between 'ad470000-0000-4000-8000-000000000011' and 'ad470000-0000-4000-8000-000000000016';
update public.saas_limits set effective_from = (now() at time zone 'America/Santiago')::date - 30
  where tenant_id between 'ad470000-0000-4000-8000-000000000011' and 'ad470000-0000-4000-8000-000000000016';
update public.saas_scheduled_plan_changes set effective_on = (now() at time zone 'America/Santiago')::date
  where tenant_id in ('ad470000-0000-4000-8000-000000000013','ad470000-0000-4000-8000-000000000016');
insert into public.students(tenant_id, full_name) values
  ('ad470000-0000-4000-8000-000000000013','New student 1'),
  ('ad470000-0000-4000-8000-000000000013','New student 2');
set local role authenticated;
do $$
declare
  s uuid;
  today date := (now() at time zone 'America/Santiago')::date;
  result jsonb;
  request uuid := 'ad470000-0000-4000-8000-000000000021';
begin
  -- Archived terms remain renewable; the tenant's administrative suspension is not touched.
  s := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000011')->'subscription'->>'id')::uuid;
  result := public.process_saas_subscription_renewal(request, s, today);
  if result->>'status' <> 'renewed' or (result->>'amount')::numeric <> 11900
    or (result->>'period_end_exclusive')::date <> today + 30 then
    raise exception 'Archived contract renewal failed: %', result;
  end if;
  if public.process_saas_subscription_renewal(request, s, today) <> result then raise exception 'Retry was not idempotent'; end if;
  begin
    perform public.process_saas_subscription_renewal(request, s, today + 1);
    raise exception 'Request identity accepted a different payload';
  exception when unique_violation then null;
  end;
  begin
    perform public.process_saas_subscription_renewal(gen_random_uuid(), s, today);
    raise exception 'A duplicate boundary was renewed';
  exception when serialization_failure then null;
  end;
  s := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000012')->'subscription'->>'id')::uuid;
  result := public.process_saas_subscription_renewal(gen_random_uuid(), s, today);
  if result->>'status' <> 'renewed' or (result->>'period_starts_on')::date <> today
    or result->>'invoice_id' is null then raise exception 'Trial failed to produce its first paid full period'; end if;
  s := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000013')->'subscription'->>'id')::uuid;
  result := public.process_saas_subscription_renewal(gen_random_uuid(), s, today);
  if result->>'change_status' <> 'blocked' or (result->>'amount')::numeric <> 11900
    or result->>'blocked_reason' is null then raise exception 'Over-capacity downgrade was not blocked'; end if;
  s := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000014')->'subscription'->>'id')::uuid;
  result := public.process_saas_subscription_renewal(gen_random_uuid(), s, today);
  if result->>'status' <> 'renewed' or result->>'invoice_id' is not null or (result->>'amount')::numeric <> 0 then
    raise exception 'Free period invented a charge'; end if;
  s := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000016')->'subscription'->>'id')::uuid;
  result := public.process_saas_subscription_renewal(gen_random_uuid(), s, today);
  if result->>'change_status' <> 'applied' or (result->>'amount')::numeric <> 5000 then
    raise exception 'Valid downgrade did not apply'; end if;
end;
$$;
reset role;
-- Force a unique-period conflict after renewal mutations, proving rollback of the whole period.
insert into public.saas_invoices(
  tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at, invoice_kind
)
select s.tenant_id, s.id, 'PREEXISTING-RENEWAL-CONFLICT', 'open', 11900, 'CLP',
  s.current_period_end_exclusive, s.current_period_end_exclusive + 29, s.current_period_end_exclusive + 30,
  s.current_period_end_exclusive, now(), 'renewal'
from public.saas_subscriptions s where s.tenant_id = 'ad470000-0000-4000-8000-000000000015';
set local role authenticated;
do $$
declare
  s uuid := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000015')->'subscription'->>'id')::uuid;
  result jsonb;
begin
  for attempt in 1..3 loop
    result := public.process_saas_subscription_renewal(gen_random_uuid(), s, (now() at time zone 'America/Santiago')::date);
    if result->>'status' <> 'failed' or result->>'error_code' <> '23505' then
      raise exception 'Conflict was not recorded as a failed transaction: %', result;
    end if;
  end loop;
end;
$$;
reset role;
do $$
begin
  if exists (select 1 from public.saas_subscriptions s
    where s.tenant_id = 'ad470000-0000-4000-8000-000000000015'
      and s.current_period_end_exclusive <> (now() at time zone 'America/Santiago')::date) then
    raise exception 'Failed invoice advanced the contract boundary';
  end if;
  if not exists (select 1 from public.saas_renewal_failures f join public.saas_subscriptions s on s.id = f.subscription_id
    where s.tenant_id = 'ad470000-0000-4000-8000-000000000015' and f.attempt_count = 3 and f.next_attempt_at is null) then
    raise exception 'Retry exhaustion was not persisted';
  end if;
  if (select count(*) from public.activity_notifications n join public.activity_events e on e.id = n.event_id
    where e.tenant_id = 'ad470000-0000-4000-8000-000000000013' and e.event_type = 'billing.subscription.change_blocked'
      and n.recipient_role = 'owner') <> 1
    or exists (select 1 from public.activity_notifications n join public.activity_events e on e.id = n.event_id
      where e.tenant_id = 'ad470000-0000-4000-8000-000000000013' and e.event_type = 'billing.subscription.change_blocked'
        and n.recipient_role <> 'owner') then
    raise exception 'Blocked change did not notify exactly the active owner';
  end if;
  if (select status from public.tenants where id = 'ad470000-0000-4000-8000-000000000011') <> 'suspended' then
    raise exception 'Renewal reactivated the tenant';
  end if;
  if exists (select 1 from public.saas_charges where tenant_id between
    'ad470000-0000-4000-8000-000000000011' and 'ad470000-0000-4000-8000-000000000016') then
    raise exception 'Renewal invented a payment';
  end if;
end;
$$;
-- Simulate reviewed reconciliation, then a fresh request (a cached failure is immutable).
delete from public.saas_invoices where invoice_number = 'PREEXISTING-RENEWAL-CONFLICT';
set local role authenticated;
do $$
declare s uuid := (public.get_saas_subscription_management('ad470000-0000-4000-8000-000000000015')->'subscription'->>'id')::uuid;
begin
  if public.process_saas_subscription_renewal(gen_random_uuid(), s, (now() at time zone 'America/Santiago')::date)->>'status' <> 'renewed' then
    raise exception 'Manual recovery failed';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub', 'ad470000-0000-4000-8000-000000000002', true);
do $$
begin
  begin
    perform public.process_saas_subscription_renewal(gen_random_uuid(), gen_random_uuid(), current_date);
    raise exception 'Owner invoked administrator renewal';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_saas_renewal_status(null);
    raise exception 'Owner read global renewal status';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.saas_renewal_runs;
    raise exception 'Unprivileged role read processor table';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
-- No more fixture periods are due; an idle worker request still records a heartbeat.
do $$
begin
  if public.process_saas_subscription_renewal(gen_random_uuid())->>'status' <> 'idle' then
    raise exception 'Worker unexpectedly renewed another period in an isolated fixture database';
  end if;
end;
$$;
reset role;
rollback;
