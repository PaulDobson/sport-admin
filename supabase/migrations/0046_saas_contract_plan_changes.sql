begin;

create function public.calculate_saas_plan_change(target_tenant uuid, target_version uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  subscription public.saas_subscriptions;
  version public.saas_plan_versions;
  plan public.saas_plans;
  business_today date := (now() at time zone 'America/Santiago')::date;
  remaining_days integer;
  new_days integer;
  old_numerator numeric;
  old_denominator numeric;
  difference_numerator numeric;
  amount_due numeric;
  kind text;
  active_students bigint;
  active_users bigint;
  quote jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  select * into subscription from public.saas_subscriptions s
    where s.tenant_id = target_tenant and s.status in ('trial','active','past_due','suspended');
  if not found then raise exception 'Current subscription not found' using errcode = 'P0002'; end if;
  if subscription.status = 'trial' then
    raise exception 'Plan changes require a payable service period after trial' using errcode = '22023';
  end if;
  if subscription.currency <> 'CLP' or subscription.price <> trunc(subscription.price)
    or subscription.plan_version_id is null or subscription.current_period_end_exclusive is null
    or business_today < subscription.current_period_starts_on
    or business_today >= subscription.current_period_end_exclusive then
    raise exception 'Contract needs renewal or CLP reconciliation before a plan change' using errcode = '22023';
  end if;
  if exists (select 1 from public.saas_scheduled_plan_changes c
    where c.subscription_id = subscription.id and c.status = 'scheduled') then
    raise exception 'Cancel the pending plan change before requesting another' using errcode = '22023';
  end if;
  -- Pre-existing limits-only schedules must be reviewed, never silently converted to charges.
  if exists (select 1 from public.saas_limits l where l.subscription_id = subscription.id
    and (l.effective_from > business_today or (
      (l.effective_until is null or l.effective_until >= business_today)
      and l.plan_id <> subscription.plan_id))) then
    raise exception 'Legacy limits schedule requires reconciliation before a commercial change' using errcode = '22023';
  end if;
  select * into version from public.saas_plan_versions v where v.id = target_version;
  if not found then raise exception 'Plan version not found' using errcode = 'P0002'; end if;
  select * into plan from public.saas_plans p where p.id = version.plan_id;
  if plan.status <> 'active' or plan.current_version_id is distinct from version.id then
    raise exception 'Plan version changed or is archived' using errcode = '40001';
  end if;
  if version.id = subscription.plan_version_id or version.currency <> 'CLP' or version.price <> trunc(version.price) then
    raise exception 'Select a different version with a whole CLP price' using errcode = '22023';
  end if;
  select count(*) into active_students from public.students s
    where s.tenant_id = target_tenant and s.status = 'active';
  select count(*) into active_users from public.tenant_memberships m
    where m.tenant_id = target_tenant and m.status = 'active';
  if active_students > version.max_students or active_users > version.max_users then
    raise exception 'Current usage exceeds the selected plan limits' using errcode = '22023';
  end if;
  remaining_days := subscription.current_period_end_exclusive - business_today;
  old_numerator := coalesce(subscription.applied_rate_numerator, subscription.price);
  old_denominator := coalesce(subscription.applied_rate_denominator,
    subscription.current_period_end_exclusive - subscription.current_period_starts_on);
  new_days := public.saas_period_boundary(business_today, version.duration_unit, version.duration_count, 1) - business_today;
  difference_numerator := version.price * old_denominator - old_numerator * new_days;
  kind := case when difference_numerator > 0 then 'upgrade'
    when difference_numerator < 0 then 'downgrade' else 'equivalent' end;
  amount_due := case when kind = 'upgrade'
    then round(difference_numerator * remaining_days / (new_days * old_denominator)) else 0 end;
  if amount_due > 9999999999 then raise exception 'Proration exceeds supported amount' using errcode = '22023'; end if;
  quote := jsonb_build_object(
    'tenant_id', target_tenant, 'subscription_id', subscription.id,
    'current_plan_name', subscription.contract_snapshot->>'name',
    'current_version_id', subscription.plan_version_id, 'plan_id', version.plan_id,
    'plan_version_id', version.id, 'plan_name', version.name, 'version_number', version.version_number,
    'business_date', business_today, 'kind', kind,
    'effective_on', case when kind = 'upgrade' then business_today else subscription.current_period_end_exclusive end,
    'period_starts_on', subscription.current_period_starts_on,
    'period_end_exclusive', subscription.current_period_end_exclusive, 'remaining_days', remaining_days,
    'current_rate_numerator', trunc(old_numerator)::text, 'current_rate_denominator', trunc(old_denominator)::text,
    'new_rate_numerator', trunc(version.price)::text, 'new_rate_denominator', new_days::text,
    'amount_due', amount_due, 'net', round(amount_due * 100 / 119),
    'vat', amount_due - round(amount_due * 100 / 119),
    'price', version.price, 'currency', 'CLP', 'duration_unit', version.duration_unit,
    'duration_count', version.duration_count, 'active_students', active_students, 'active_users', active_users,
    'max_students', version.max_students, 'max_users', version.max_users,
    'features', version.features, 'services', version.services,
    'subscription_updated_at', subscription.updated_at,
    'contract_snapshot', to_jsonb(version) - 'created_by' - 'created_at'
  );
  return quote || jsonb_build_object('fingerprint', md5(quote::text));
end;
$$;

create function public.preview_saas_plan_change(target_tenant uuid, target_version uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  result := public.calculate_saas_plan_change(target_tenant, target_version);
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.plan_change_preview', 'Previsualizar cambio contractual', 'succeeded',
    jsonb_build_object('target_version', target_version, 'fingerprint', result->>'fingerprint')
  );
  return result;
end;
$$;

create function public.confirm_saas_plan_change(
  target_tenant uuid, target_version uuid, expected_fingerprint text, operation_id uuid, change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous_operation public.saas_billing_operations;
  request_payload jsonb;
  quote jsonb;
  version public.saas_plan_versions;
  subscription public.saas_subscriptions;
  invoice_id uuid;
  scheduled_id uuid;
  business_today date := (now() at time zone 'America/Santiago')::date;
  result jsonb;
  cycle text;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or expected_fingerprint is null or change_reason is null
    or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'Operation, preview and reason are required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('tenant', target_tenant, 'version', target_version,
    'fingerprint', expected_fingerprint, 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous_operation from public.saas_billing_operations o
    where o.operation_id = confirm_saas_plan_change.operation_id;
  if found then
    if previous_operation.action <> 'change_plan' or previous_operation.actor_user_id <> auth.uid()
      or previous_operation.payload <> request_payload then
      raise exception 'Operation id was already used with a different payload' using errcode = '23505';
    end if;
    return previous_operation.result;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('saas-limit:' || target_tenant::text || ':student', 0));
  perform pg_advisory_xact_lock(hashtextextended('saas-limit:' || target_tenant::text || ':user', 0));
  select * into subscription from public.saas_subscriptions s
    where s.tenant_id = target_tenant and s.status in ('trial','active','past_due','suspended')
    for update;
  perform 1 from public.saas_plans p join public.saas_plan_versions v on v.plan_id = p.id
    where v.id = target_version for no key update of p;
  quote := public.calculate_saas_plan_change(target_tenant, target_version);
  if quote->>'fingerprint' is distinct from expected_fingerprint then
    raise exception 'Plan change preview is stale' using errcode = '40001';
  end if;
  select * into version from public.saas_plan_versions v where v.id = target_version;
  if quote->>'kind' = 'upgrade' then
    cycle := case when version.duration_unit = 'months' then
      case version.duration_count when 1 then 'monthly' when 3 then 'quarterly'
        when 6 then 'semiannual' when 12 then 'annual' else 'custom' end else 'custom' end;
    update public.saas_limits l set effective_until = business_today - 1
      where l.subscription_id = subscription.id and l.effective_from < business_today
        and (l.effective_until is null or l.effective_until >= business_today);
    update public.saas_subscriptions set
      plan_id = version.plan_id, plan_version_id = version.id,
      contract_snapshot = quote->'contract_snapshot', price = version.price, currency = 'CLP',
      billing_cycle = cycle, duration_unit = version.duration_unit, duration_count = version.duration_count,
      applied_rate_numerator = (quote->>'new_rate_numerator')::numeric,
      applied_rate_denominator = (quote->>'new_rate_denominator')::numeric,
      period_anchor_on = subscription.current_period_end_exclusive, period_index = 0,
      payment_status = case when (quote->>'amount_due')::numeric > 0 and payment_status <> 'partial'
        then 'pending' else payment_status end
    where id = subscription.id;
    -- Intraday contract history remains in immutable versions/events; limits are date-effective.
    insert into public.saas_limits(tenant_id, subscription_id, plan_id, max_students, max_users, features, effective_from)
      values(target_tenant, subscription.id, version.plan_id, version.max_students, version.max_users, version.features, business_today)
      on conflict (tenant_id, subscription_id, effective_from) do update set
        plan_id = excluded.plan_id, max_students = excluded.max_students,
        max_users = excluded.max_users, features = excluded.features, effective_until = null;
    if (quote->>'amount_due')::numeric > 0 then
      invoice_id := gen_random_uuid();
      insert into public.saas_invoices (
        id, tenant_id, subscription_id, invoice_number, status, amount, currency,
        period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at,
        plan_version_id, invoice_kind, contract_snapshot, line_items
      ) values (
        invoice_id, target_tenant, subscription.id, 'SAAS-' || invoice_id::text, 'open',
        (quote->>'amount_due')::numeric, 'CLP', business_today,
        subscription.current_period_end_exclusive - 1, subscription.current_period_end_exclusive,
        business_today, now(), version.id, 'upgrade', quote->'contract_snapshot',
        jsonb_build_array(quote || jsonb_build_object('concept', 'Diferencia proporcional por upgrade'))
      );
    end if;
  else
    insert into public.saas_scheduled_plan_changes(
      tenant_id, subscription_id, plan_id, plan_version_id, effective_on, reason, operation_id, created_by
    ) values (
      target_tenant, subscription.id, version.plan_id, version.id,
      subscription.current_period_end_exclusive, btrim(change_reason), operation_id, auth.uid()
    ) returning id into scheduled_id;
  end if;
  result := jsonb_build_object('tenant_id', target_tenant, 'subscription_id', subscription.id,
    'plan_version_id', target_version, 'kind', quote->>'kind', 'effective_on', quote->>'effective_on',
    'amount_due', quote->'amount_due', 'invoice_id', invoice_id, 'scheduled_change_id', scheduled_id);
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, tenant_id, payload, result)
    values(operation_id, 'change_plan', auth.uid(), target_tenant, request_payload, result);
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.plan_change_confirmed', btrim(change_reason), 'succeeded', result
  );
  return result;
end;
$$;

create function public.cancel_saas_scheduled_change(target_tenant uuid, target_change uuid, operation_id uuid, change_reason text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous_operation public.saas_billing_operations;
  selected_change public.saas_scheduled_plan_changes;
  request_payload jsonb;
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or change_reason is null or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'Operation and reason are required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('tenant', target_tenant, 'change', target_change, 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous_operation from public.saas_billing_operations o
    where o.operation_id = cancel_saas_scheduled_change.operation_id;
  if found then
    if previous_operation.action <> 'cancel_plan_change' or previous_operation.actor_user_id <> auth.uid()
      or previous_operation.payload <> request_payload then
      raise exception 'Operation id was already used with a different payload' using errcode = '23505';
    end if;
    return previous_operation.result;
  end if;
  perform 1 from public.saas_subscriptions s where s.tenant_id = target_tenant
    and s.id = (select c.subscription_id from public.saas_scheduled_plan_changes c where c.id = target_change)
    for update;
  select * into selected_change from public.saas_scheduled_plan_changes c
    where c.id = target_change and c.tenant_id = target_tenant for update;
  if not found or selected_change.status <> 'scheduled' then
    raise exception 'Scheduled change is no longer pending' using errcode = '40001';
  end if;
  update public.saas_scheduled_plan_changes set status = 'cancelled', processed_at = now()
    where id = target_change;
  result := jsonb_build_object('tenant_id', target_tenant, 'scheduled_change_id', target_change, 'status', 'cancelled');
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, tenant_id, payload, result)
    values(operation_id, 'cancel_plan_change', auth.uid(), target_tenant, request_payload, result);
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.scheduled_change_cancelled', btrim(change_reason), 'succeeded', result
  );
  return result;
end;
$$;

-- Keep the audited legacy wrapper, but reject contractual changes through its limits-only body.
alter function public.schedule_saas_plan_limits_unlogged(uuid, uuid, uuid, date, text)
  rename to schedule_saas_plan_limits_legacy;
create function public.schedule_saas_plan_limits_unlogged(
  target_tenant uuid, target_subscription uuid, target_plan uuid, target_effective_from date, change_reason text
)
returns public.saas_limits language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  perform 1 from public.saas_subscriptions s
    where s.id = target_subscription and s.tenant_id = target_tenant for update;
  if exists (select 1 from public.saas_plans p where p.id = target_plan and p.commercially_managed)
    or exists (select 1 from public.saas_subscriptions s join public.saas_plans p on p.id = s.plan_id
      where s.id = target_subscription and s.tenant_id = target_tenant
        and (p.commercially_managed or exists (select 1 from public.saas_billing_operations o
          where o.tenant_id = target_tenant and o.action in ('assign_subscription', 'change_plan')
            and o.result->>'subscription_id' = s.id::text))) then
    raise exception 'Use a confirmed contractual plan change, not limits-only scheduling' using errcode = '22023';
  end if;
  return public.schedule_saas_plan_limits_legacy(
    target_tenant, target_subscription, target_plan, target_effective_from, change_reason
  );
end;
$$;
revoke all on function public.schedule_saas_plan_limits_legacy(uuid, uuid, uuid, date, text) from public, anon, authenticated;
revoke all on function public.schedule_saas_plan_limits_unlogged(uuid, uuid, uuid, date, text) from public, anon, authenticated;
revoke all on function public.calculate_saas_plan_change(uuid, uuid) from public, anon, authenticated;
revoke all on function public.preview_saas_plan_change(uuid, uuid) from public, anon;
revoke all on function public.confirm_saas_plan_change(uuid, uuid, text, uuid, text) from public, anon;
revoke all on function public.cancel_saas_scheduled_change(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.preview_saas_plan_change(uuid, uuid) to authenticated;
grant execute on function public.confirm_saas_plan_change(uuid, uuid, text, uuid, text) to authenticated;
grant execute on function public.cancel_saas_scheduled_change(uuid, uuid, uuid, text) to authenticated;

commit;
