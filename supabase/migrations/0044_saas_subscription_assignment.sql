begin;

alter table public.saas_subscriptions
  add column first_invoice_due_on date,
  add column period_index integer not null default 0 check (period_index >= 0);
alter table public.saas_subscription_events
  add column event_order bigint generated always as identity;
alter table public.saas_subscriptions drop constraint saas_subscriptions_billing_cycle_check;
alter table public.saas_subscriptions add constraint saas_subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'custom'));
alter table public.saas_subscription_events drop constraint saas_subscription_events_billing_cycle_check;
alter table public.saas_subscription_events add constraint saas_subscription_events_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'custom'));

create function public.saas_period_boundary(anchor_on date, duration_unit text, duration_count integer, period_index integer)
returns date language plpgsql immutable set search_path = public
as $$
declare
  offset_count bigint;
  month_start date;
  result date;
begin
  if anchor_on is null or anchor_on not between date '0001-01-01' and date '9999-12-31'
    or duration_unit is null or duration_unit not in ('days', 'months')
    or duration_count is null or duration_count <= 0 or period_index is null or period_index < 0 then
    raise exception 'Invalid billing duration or date' using errcode = '22023';
  end if;
  offset_count := duration_count::bigint * period_index;
  if duration_unit = 'days' then
    if offset_count > date '9999-12-31' - anchor_on then
      raise exception 'Billing period exceeds the supported date range' using errcode = '22023';
    end if;
    result := anchor_on + offset_count::integer;
  else
    if offset_count > (9999 - extract(year from anchor_on)) * 12 + 12 - extract(month from anchor_on) then
      raise exception 'Billing period exceeds the supported date range' using errcode = '22023';
    end if;
    month_start := (date_trunc('month', anchor_on) + make_interval(months => offset_count::integer))::date;
    result := month_start + least(
      extract(day from anchor_on)::integer,
      extract(day from month_start + interval '1 month - 1 day')::integer
    ) - 1;
  end if;
  return result;
end;
$$;

create or replace function public.record_saas_subscription_status()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  event_effective_on date;
  business_today date := (now() at time zone 'America/Santiago')::date;
begin
  if tg_op = 'UPDATE' and old.status = new.status and old.price = new.price
    and old.currency = new.currency and old.billing_cycle = new.billing_cycle
    and old.plan_version_id is not distinct from new.plan_version_id
    and old.duration_unit is not distinct from new.duration_unit
    and old.duration_count is not distinct from new.duration_count then
    return new;
  end if;
  event_effective_on := case
    when new.status in ('cancelled', 'expired') then coalesce(new.ended_on, business_today)
    when tg_op = 'UPDATE' and old.status = 'trial' and new.status = 'active'
      then coalesce(new.converted_at, business_today)
    when tg_op = 'INSERT' then new.starts_on
    else business_today end;
  insert into public.saas_subscription_events (
    tenant_id, subscription_id, previous_status, new_status,
    price, currency, billing_cycle, effective_on, plan_version_id, duration_unit, duration_count
  ) values (
    new.tenant_id, new.id, case when tg_op = 'UPDATE' then old.status end,
    new.status, new.price, new.currency, new.billing_cycle, event_effective_on,
    new.plan_version_id, new.duration_unit, new.duration_count
  );
  return new;
end;
$$;
drop trigger record_saas_subscription_status on public.saas_subscriptions;
create trigger record_saas_subscription_status
  after insert or update of status, price, currency, billing_cycle, plan_version_id, duration_unit, duration_count
  on public.saas_subscriptions for each row execute function public.record_saas_subscription_status();

create function public.get_saas_subscription_management(target_tenant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.subscription_read', 'Consultar contrato y uso del tenant', 'succeeded'
  );
  select jsonb_build_object(
    'tenant_id', t.id, 'tenant_name', t.name, 'tenant_status', t.status,
    'business_date', (now() at time zone 'America/Santiago')::date,
    'active_students', (select count(*) from public.students s where s.tenant_id = t.id and s.status = 'active'),
    'active_users', (select count(*) from public.tenant_memberships m where m.tenant_id = t.id and m.status = 'active'),
    'scheduled_change', (
      select jsonb_build_object('id', c.id, 'plan_name', v.name, 'price', v.price, 'currency', v.currency, 'effective_on', c.effective_on,
        'status', c.status, 'reason', c.reason, 'blocked_reason', c.blocked_reason)
      from public.saas_scheduled_plan_changes c
      join public.saas_plan_versions v on v.id = c.plan_version_id
      join public.saas_subscriptions s on s.id = c.subscription_id
      where c.tenant_id = t.id and c.status in ('scheduled','blocked')
        and s.status in ('trial','active','past_due','suspended')
      order by c.created_at desc, c.id desc limit 1
    ),
    'subscription', (
      select jsonb_build_object(
        'id', s.id, 'plan_id', s.plan_id, 'plan_version_id', s.plan_version_id,
        'status', s.status, 'payment_status', s.payment_status,
        'starts_on', s.starts_on, 'period_starts_on', s.current_period_starts_on,
        'period_end_exclusive', coalesce(s.current_period_end_exclusive, s.current_period_ends_on + 1),
        'next_billing_date', s.next_billing_date, 'price', s.price, 'currency', s.currency,
        'contract_snapshot', s.contract_snapshot,
        'duration_unit', s.duration_unit, 'duration_count', s.duration_count
      ) from public.saas_subscriptions s
      where s.tenant_id = t.id and s.status in ('trial', 'active', 'past_due', 'suspended')
    )
  ) into result from public.tenants t where t.id = target_tenant;
  if result is null then
    raise exception 'Tenant not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

-- Internal calculator is shared by preview and confirmation; it never writes.
create function public.calculate_saas_assignment(
  target_tenant uuid, target_version uuid, starts_on date, use_trial boolean, due_on date
)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  tenant public.tenants;
  plan public.saas_plans;
  version public.saas_plan_versions;
  business_today date := (now() at time zone 'America/Santiago')::date;
  paid_start date;
  paid_end date;
  deadline date;
  active_students bigint;
  active_users bigint;
  quoted jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  select * into tenant from public.tenants t where t.id = target_tenant;
  if not found then raise exception 'Tenant not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.saas_subscriptions s where s.tenant_id = target_tenant
    and s.status in ('trial','active','past_due','suspended')) then
    raise exception 'Tenant already has a current subscription' using errcode = '23505';
  end if;
  select * into version from public.saas_plan_versions v where v.id = target_version;
  if not found then raise exception 'Plan version not found' using errcode = 'P0002'; end if;
  select * into plan from public.saas_plans p where p.id = version.plan_id;
  if plan.status <> 'active' or plan.current_version_id is distinct from target_version then
    raise exception 'Plan version is no longer assignable' using errcode = '40001';
  end if;
  if version.currency <> 'CLP' or version.price <> trunc(version.price)
    or starts_on is null or starts_on < business_today or use_trial is null
    or (use_trial and version.trial_days = 0) then
    raise exception 'Invalid assignment dates, trial or CLP terms' using errcode = '22023';
  end if;
  select count(*) into active_students from public.students s
    where s.tenant_id = target_tenant and s.status = 'active';
  select count(*) into active_users from public.tenant_memberships m
    where m.tenant_id = target_tenant and m.status = 'active';
  if active_students > version.max_students or active_users > version.max_users then
    raise exception 'Current usage exceeds the selected plan limits' using errcode = '22023';
  end if;
  paid_start := case when use_trial then public.saas_period_boundary(starts_on, 'days', version.trial_days, 1) else starts_on end;
  paid_end := public.saas_period_boundary(paid_start, version.duration_unit, version.duration_count, 1);
  deadline := coalesce(due_on, paid_start);
  if deadline < business_today or deadline > date '9999-12-31' then
    raise exception 'Invalid invoice deadline' using errcode = '22023';
  end if;
  quoted := jsonb_build_object(
    'tenant_id', target_tenant, 'tenant_name', tenant.name, 'tenant_status', tenant.status,
    'plan_id', plan.id, 'plan_version_id', version.id,
    'plan_name', version.name, 'version_number', version.version_number,
    'business_date', business_today, 'starts_on', starts_on, 'use_trial', use_trial,
    'trial_end_exclusive', case when use_trial then paid_start end,
    'first_paid_period', jsonb_build_object('starts_on', paid_start, 'end_exclusive', paid_end),
    'due_on', deadline, 'price', version.price, 'currency', version.currency,
    'initial_amount', case when use_trial then 0 else version.price end,
    'initial_invoice', not use_trial and version.price > 0,
    'net', case when use_trial then 0 else round(version.price * 100 / 119) end,
    'vat', case when use_trial then 0 else version.price - round(version.price * 100 / 119) end,
    'duration_unit', version.duration_unit, 'duration_count', version.duration_count,
    'active_students', active_students, 'active_users', active_users,
    'max_students', version.max_students, 'max_users', version.max_users,
    'features', version.features, 'services', version.services,
    'contract_snapshot', to_jsonb(version) - 'created_by' - 'created_at'
  );
  return quoted || jsonb_build_object('fingerprint', md5(quoted::text));
end;
$$;

create function public.preview_saas_subscription_assignment(
  target_tenant uuid, target_version uuid, starts_on date, use_trial boolean, due_on date default null
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  result := public.calculate_saas_assignment(target_tenant, target_version, starts_on, use_trial, due_on);
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.assignment_preview', 'Previsualizar asignacion comercial', 'succeeded',
    jsonb_build_object('plan_version_id', target_version, 'fingerprint', result->>'fingerprint')
  );
  return result;
end;
$$;

create function public.confirm_saas_subscription_assignment(
  target_tenant uuid, target_version uuid, starts_on date, use_trial boolean, due_on date,
  expected_fingerprint text, operation_id uuid, change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous_operation public.saas_billing_operations;
  request_payload jsonb;
  quote jsonb;
  version public.saas_plan_versions;
  subscription_id uuid := gen_random_uuid();
  invoice_id uuid;
  active_start date;
  active_end date;
  paid_start date;
  paid_end date;
  cycle text;
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or expected_fingerprint is null or change_reason is null
    or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'Operation, preview and reason are required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('tenant', target_tenant, 'version', target_version,
    'starts_on', starts_on, 'trial', use_trial, 'due_on', due_on,
    'fingerprint', expected_fingerprint, 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous_operation from public.saas_billing_operations o
    where o.operation_id = confirm_saas_subscription_assignment.operation_id;
  if found then
    if previous_operation.action <> 'assign_subscription' or previous_operation.actor_user_id <> auth.uid()
      or previous_operation.payload <> request_payload then
      raise exception 'Operation id was already used with a different payload' using errcode = '23505';
    end if;
    return previous_operation.result;
  end if;

  -- Same resource locks as student/member activation; prevent a stale usage preview.
  perform pg_advisory_xact_lock(hashtextextended('saas-limit:' || target_tenant::text || ':student', 0));
  perform pg_advisory_xact_lock(hashtextextended('saas-limit:' || target_tenant::text || ':user', 0));
  perform 1 from public.tenants t where t.id = target_tenant for no key update;
  perform 1 from public.saas_plans p join public.saas_plan_versions v on v.plan_id = p.id
    where v.id = target_version for no key update of p;
  quote := public.calculate_saas_assignment(target_tenant, target_version, starts_on, use_trial, due_on);
  if quote->>'fingerprint' is distinct from expected_fingerprint then
    raise exception 'Assignment preview is stale; review the updated terms' using errcode = '40001';
  end if;
  select * into version from public.saas_plan_versions v where v.id = target_version;
  paid_start := (quote->'first_paid_period'->>'starts_on')::date;
  paid_end := (quote->'first_paid_period'->>'end_exclusive')::date;
  active_start := starts_on;
  active_end := case when use_trial then paid_start else paid_end end;
  cycle := case when version.duration_unit = 'months' then
    case version.duration_count when 1 then 'monthly' when 3 then 'quarterly'
      when 6 then 'semiannual' when 12 then 'annual' else 'custom' end else 'custom' end;
  insert into public.saas_subscriptions (
    id, tenant_id, plan_id, plan_version_id, status, payment_status, starts_on,
    trial_ends_on, current_period_starts_on, current_period_ends_on,
    current_period_end_exclusive, next_billing_date, price, currency, billing_cycle,
    duration_unit, duration_count, period_anchor_on, period_index, contract_snapshot,
    applied_rate_numerator, applied_rate_denominator, first_invoice_due_on
  ) values (
    subscription_id, target_tenant, version.plan_id, version.id,
    case when use_trial then 'trial' else 'active' end,
    case when (quote->>'initial_invoice')::boolean then 'pending' else 'not_due' end,
    starts_on, case when use_trial then paid_start - 1 end, active_start, active_end - 1,
    active_end, active_end, version.price, 'CLP', cycle, version.duration_unit, version.duration_count,
    paid_start, 0, quote->'contract_snapshot', version.price, paid_end - paid_start,
    (quote->>'due_on')::date
  );
  insert into public.saas_limits (
    tenant_id, subscription_id, plan_id, max_students, max_users, features, effective_from
  ) values (
    target_tenant, subscription_id, version.plan_id, version.max_students, version.max_users,
    version.features, starts_on
  );
  if (quote->>'initial_invoice')::boolean then
    invoice_id := gen_random_uuid();
    insert into public.saas_invoices (
      id, tenant_id, subscription_id, invoice_number, status, amount, currency,
      period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at,
      plan_version_id, invoice_kind, contract_snapshot, line_items
    ) values (
      invoice_id, target_tenant, subscription_id, 'SAAS-' || invoice_id::text,
      'open', version.price, 'CLP', paid_start, paid_end - 1, paid_end,
      (quote->>'due_on')::date, now(), version.id, 'initial', quote->'contract_snapshot',
      jsonb_build_array(jsonb_build_object(
        'concept', 'Suscripcion inicial', 'plan_name', version.name, 'amount', version.price,
        'net', quote->'net', 'vat', quote->'vat', 'vat_rate', 19, 'services', version.services
      ))
    );
  end if;
  result := jsonb_build_object('tenant_id', target_tenant, 'subscription_id', subscription_id,
    'plan_version_id', target_version, 'invoice_id', invoice_id,
    'status', case when use_trial then 'trial' else 'active' end,
    'initial_amount', quote->'initial_amount', 'period_end_exclusive', active_end);
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, tenant_id, payload, result)
    values (operation_id, 'assign_subscription', auth.uid(), target_tenant, request_payload, result);
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.subscription_assigned', btrim(change_reason), 'succeeded', result
  );
  return result;
end;
$$;

revoke all on function public.saas_period_boundary(date, text, integer, integer) from public, anon, authenticated;
revoke all on function public.calculate_saas_assignment(uuid, uuid, date, boolean, date) from public, anon, authenticated;
revoke all on function public.get_saas_subscription_management(uuid) from public, anon;
revoke all on function public.preview_saas_subscription_assignment(uuid, uuid, date, boolean, date) from public, anon;
revoke all on function public.confirm_saas_subscription_assignment(uuid, uuid, date, boolean, date, text, uuid, text) from public, anon;
grant execute on function public.get_saas_subscription_management(uuid) to authenticated;
grant execute on function public.preview_saas_subscription_assignment(uuid, uuid, date, boolean, date) to authenticated;
grant execute on function public.confirm_saas_subscription_assignment(uuid, uuid, date, boolean, date, text, uuid, text) to authenticated;

commit;
