-- Prepared for disposable PostgreSQL validation before enabling SAAS_RENEWALS_ENABLED.
begin;

create table public.saas_renewal_runs (
  request_id uuid primary key,
  actor_user_id uuid references auth.users(id) on delete restrict,
  payload jsonb not null,
  tenant_id uuid references public.tenants(id) on delete restrict,
  subscription_id uuid references public.saas_subscriptions(id) on delete restrict,
  status text not null check (status in ('idle', 'renewed', 'failed')),
  result jsonb not null,
  occurred_at timestamptz not null default clock_timestamp()
);
create index saas_renewal_runs_date_idx on public.saas_renewal_runs(occurred_at desc);
create index saas_renewal_runs_subscription_idx on public.saas_renewal_runs(subscription_id, occurred_at desc);
create trigger saas_renewal_runs_immutable before update or delete on public.saas_renewal_runs
  for each row execute function public.reject_saas_snapshot_mutation();
create table public.saas_renewal_failures (
  subscription_id uuid not null references public.saas_subscriptions(id) on delete restrict,
  period_starts_on date not null,
  attempt_count integer not null check (attempt_count between 1 and 3),
  next_attempt_at timestamptz,
  error_code text not null,
  primary key (subscription_id, period_starts_on),
  check ((attempt_count < 3 and next_attempt_at is not null) or (attempt_count = 3 and next_attempt_at is null))
);
alter table public.saas_renewal_runs enable row level security;
alter table public.saas_renewal_failures enable row level security;
revoke all on public.saas_renewal_runs, public.saas_renewal_failures from public, anon, authenticated;

-- Owner-only activity delivery. Platform administrators see the durable blocked change in the renewal console.
create function public.notify_saas_blocked_plan_change(target_change uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  change public.saas_scheduled_plan_changes;
  created_event uuid;
  created_notification uuid;
  recipient record;
begin
  select * into strict change from public.saas_scheduled_plan_changes c where c.id = target_change and c.status = 'blocked';
  insert into public.activity_events(
    tenant_id, operation_id, event_type, severity, origin, entity_type, entity_id, title, message, metadata, occurred_at
  ) values (
    change.tenant_id, public.activity_operation_id('saas-plan-change-blocked:' || change.id::text),
    'billing.subscription.change_blocked', 'warning', 'saas', 'saas_subscription', change.subscription_id,
    'Cambio de plan bloqueado', change.blocked_reason,
    jsonb_build_object('subscription_id', change.subscription_id, 'scheduled_change_id', change.id), now()
  ) on conflict (tenant_id, operation_id) do nothing returning id into created_event;
  if created_event is null then
    select e.id into strict created_event from public.activity_events e
      where e.tenant_id = change.tenant_id
        and e.operation_id = public.activity_operation_id('saas-plan-change-blocked:' || change.id::text);
  end if;
  for recipient in select m.user_id from public.tenant_memberships m
    where m.tenant_id = change.tenant_id and m.status = 'active' and m.role = 'owner'
  loop
    insert into public.activity_notifications(tenant_id, event_id, recipient_user_id, recipient_role)
      values(change.tenant_id, created_event, recipient.user_id, 'owner')
      on conflict (tenant_id, event_id, recipient_user_id) do nothing returning id into created_notification;
    if created_notification is null then
      select n.id into strict created_notification from public.activity_notifications n
        where n.tenant_id = change.tenant_id and n.event_id = created_event
          and n.recipient_user_id = recipient.user_id;
    end if;
    insert into public.notification_deliveries(tenant_id, activity_notification_id, channel, next_attempt_at)
      values(change.tenant_id, created_notification, 'internal', now())
      on conflict (tenant_id, activity_notification_id, channel) do nothing;
  end loop;
end;
$$;

create function public.process_saas_subscription_renewal(
  request_id uuid, target_subscription uuid default null, expected_period_end date default null
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  request_payload jsonb;
  previous_run public.saas_renewal_runs;
  candidate record;
  subscription public.saas_subscriptions;
  version public.saas_plan_versions;
  pending_change public.saas_scheduled_plan_changes;
  next_version public.saas_plan_versions;
  has_change boolean := false;
  selected boolean := false;
  transition boolean;
  period_start date;
  period_end date;
  next_anchor date;
  next_index integer;
  deadline date;
  active_students bigint;
  active_users bigint;
  blocked_reason text;
  invoice_id uuid;
  invoice_kind text;
  cycle text;
  result jsonb;
  failure_code text;
  business_today date := (now() at time zone 'America/Santiago')::date;
begin
  if not (coalesce(auth.role(), '') = 'service_role'
    or (auth.uid() is not null and public.is_platform_admin())) then
    raise exception 'Billing processor access required' using errcode = '42501';
  end if;
  if request_id is null or (target_subscription is null) <> (expected_period_end is null)
    or (auth.role() is distinct from 'service_role' and target_subscription is null) then
    raise exception 'A manual request requires an explicit subscription and expected boundary' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('subscription_id', target_subscription, 'expected_period_end', expected_period_end);
  perform pg_advisory_xact_lock(hashtextextended('saas-renewal-request:' || request_id::text, 0));
  select * into previous_run from public.saas_renewal_runs r where r.request_id = process_saas_subscription_renewal.request_id;
  if found then
    if previous_run.actor_user_id is distinct from auth.uid() or previous_run.payload <> request_payload then
      raise exception 'Renewal request already used with another payload or actor' using errcode = '23505';
    end if;
    return previous_run.result;
  end if;
  -- Match the lock order of assignment/upgrades: usage guards before subscription.
  for candidate in
    select s.id, s.tenant_id from public.saas_subscriptions s
    left join public.saas_renewal_failures f on f.subscription_id = s.id
      and f.period_starts_on = s.current_period_end_exclusive
    where s.status in ('trial','active','past_due','suspended')
      and (target_subscription is null or s.id = target_subscription)
      and s.current_period_end_exclusive <= business_today
      and (target_subscription is not null or f.subscription_id is null
        or (f.attempt_count < 3 and f.next_attempt_at <= now()))
    order by s.current_period_end_exclusive, s.id limit 20
  loop
    if not pg_try_advisory_xact_lock(hashtextextended('saas-limit:' || candidate.tenant_id::text || ':student', 0))
      or not pg_try_advisory_xact_lock(hashtextextended('saas-limit:' || candidate.tenant_id::text || ':user', 0)) then
      continue;
    end if;
    select * into subscription from public.saas_subscriptions s where s.id = candidate.id for update skip locked;
    if found and subscription.status in ('trial','active','past_due','suspended')
      and subscription.current_period_end_exclusive <= business_today then
      if target_subscription is null and exists (
        select 1 from public.saas_renewal_failures f where f.subscription_id = subscription.id
          and f.period_starts_on = subscription.current_period_end_exclusive
          and (f.attempt_count = 3 or f.next_attempt_at > now())
      ) then continue; end if;
      selected := true;
      exit;
    end if;
  end loop;
  if not selected then
    if target_subscription is not null then
      raise exception 'Subscription is not due or is being processed; reload before retrying' using errcode = '40001';
    end if;
    result := jsonb_build_object('status', 'idle');
    insert into public.saas_renewal_runs(request_id, actor_user_id, payload, status, result)
      values(request_id, auth.uid(), request_payload, 'idle', result);
    return result;
  end if;
  if target_subscription is not null and subscription.current_period_end_exclusive is distinct from expected_period_end then
    raise exception 'Renewal boundary changed; review the contract again' using errcode = '40001';
  end if;
  period_start := subscription.current_period_end_exclusive;
  -- A failed transaction is rolled back to this savepoint, then recorded explicitly.
  begin
    if subscription.plan_version_id is null or subscription.currency <> 'CLP'
      or subscription.price <> trunc(subscription.price) or subscription.period_anchor_on is null
      or subscription.next_billing_date is distinct from period_start then
      raise exception 'Contract requires reconciliation' using errcode = '22023';
    end if;
    select * into strict version from public.saas_plan_versions v where v.id = subscription.plan_version_id;
    if version.price <> subscription.price or version.duration_unit is distinct from subscription.duration_unit
      or version.duration_count is distinct from subscription.duration_count then
      raise exception 'Contract differs from its immutable version' using errcode = '22023';
    end if;
    if exists (select 1 from public.saas_limits l where l.subscription_id = subscription.id
      and (l.effective_from >= period_start or ((l.effective_until is null or l.effective_until >= period_start - 1)
        and (l.plan_id <> subscription.plan_id or l.max_students <> version.max_students
          or l.max_users <> version.max_users or l.features <> version.features)))) then
      raise exception 'Legacy limits schedule requires reconciliation' using errcode = '22023';
    end if;
    transition := subscription.period_anchor_on = period_start and subscription.period_index = 0;
    if (not transition and (
      public.saas_period_boundary(subscription.period_anchor_on, version.duration_unit, version.duration_count, subscription.period_index)
        <> subscription.current_period_starts_on
      or public.saas_period_boundary(subscription.period_anchor_on, version.duration_unit, version.duration_count, subscription.period_index + 1)
        <> period_start)) or (subscription.status = 'trial' and not transition) then
      raise exception 'Contract anchor requires reconciliation' using errcode = '22023';
    end if;
    next_anchor := subscription.period_anchor_on;
    next_index := case when transition then 0 else subscription.period_index + 1 end;
    select * into pending_change from public.saas_scheduled_plan_changes c
      where c.subscription_id = subscription.id and c.status = 'scheduled' for update;
    has_change := found;
    if has_change then
      if pending_change.effective_on <> period_start then
        raise exception 'Scheduled change boundary requires reconciliation' using errcode = '22023';
      end if;
      select * into strict next_version from public.saas_plan_versions v where v.id = pending_change.plan_version_id;
      if next_version.currency <> 'CLP' or next_version.price <> trunc(next_version.price) then
        raise exception 'Scheduled terms require CLP reconciliation' using errcode = '22023';
      end if;
      select count(*) into active_students from public.students s where s.tenant_id = subscription.tenant_id and s.status = 'active';
      select count(*) into active_users from public.tenant_memberships m where m.tenant_id = subscription.tenant_id and m.status = 'active';
      if active_students > next_version.max_students or active_users > next_version.max_users then
        blocked_reason := format('Uso actual: %s/%s alumnos y %s/%s usuarios. Se renovó el plan anterior.',
          active_students, next_version.max_students, active_users, next_version.max_users);
        update public.saas_scheduled_plan_changes set status = 'blocked', processed_at = now(),
          blocked_reason = process_saas_subscription_renewal.blocked_reason where id = pending_change.id;
        perform public.notify_saas_blocked_plan_change(pending_change.id);
      else
        version := next_version;
        next_anchor := period_start;
        next_index := 0;
        update public.saas_scheduled_plan_changes set status = 'applied', processed_at = now() where id = pending_change.id;
      end if;
    end if;
    period_end := public.saas_period_boundary(next_anchor, version.duration_unit, version.duration_count, next_index + 1);
    if public.saas_period_boundary(next_anchor, version.duration_unit, version.duration_count, next_index) <> period_start then
      raise exception 'Renewal would create a service gap' using errcode = '22023';
    end if;
    deadline := case when subscription.status = 'trial' then coalesce(subscription.first_invoice_due_on, period_start) else period_start end;
    if deadline < period_start then raise exception 'Initial deadline requires reconciliation' using errcode = '22023'; end if;
    invoice_kind := case when subscription.status = 'trial' then 'initial' else 'renewal' end;
    cycle := case when version.duration_unit = 'months' then case version.duration_count
      when 1 then 'monthly' when 3 then 'quarterly' when 6 then 'semiannual' when 12 then 'annual' else 'custom' end else 'custom' end;
    -- Close old terms before changing the contract; the commercial guard validates against that version.
    update public.saas_limits l set effective_until = period_start - 1
      where l.subscription_id = subscription.id and l.effective_from < period_start
        and (l.effective_until is null or l.effective_until >= period_start);
    update public.saas_subscriptions set
      plan_id = version.plan_id, plan_version_id = version.id,
      contract_snapshot = to_jsonb(version) - 'created_by' - 'created_at',
      price = version.price, currency = version.currency, billing_cycle = cycle,
      duration_unit = version.duration_unit, duration_count = version.duration_count,
      period_anchor_on = next_anchor, period_index = next_index,
      current_period_starts_on = period_start, current_period_ends_on = period_end - 1,
      current_period_end_exclusive = period_end, next_billing_date = period_end,
      applied_rate_numerator = version.price, applied_rate_denominator = period_end - period_start,
      status = case when subscription.status = 'trial' then 'active' else subscription.status end,
      converted_at = case when subscription.status = 'trial' then period_start else converted_at end,
      payment_status = case when version.price > 0 and payment_status <> 'partial' then 'pending' else payment_status end
    where id = subscription.id;
    insert into public.saas_limits(tenant_id, subscription_id, plan_id, max_students, max_users, features, effective_from)
      values(subscription.tenant_id, subscription.id, version.plan_id, version.max_students, version.max_users, version.features, period_start)
      on conflict (tenant_id, subscription_id, effective_from) do update set plan_id = excluded.plan_id,
        max_students = excluded.max_students, max_users = excluded.max_users, features = excluded.features, effective_until = null;
    if version.price > 0 then
      invoice_id := gen_random_uuid();
      insert into public.saas_invoices(
        id, tenant_id, subscription_id, invoice_number, status, amount, currency,
        period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at,
        plan_version_id, invoice_kind, contract_snapshot, line_items
      ) values (
        invoice_id, subscription.tenant_id, subscription.id, 'SAAS-' || invoice_id::text, 'open', version.price, 'CLP',
        period_start, period_end - 1, period_end, deadline, now(),
        version.id, invoice_kind, to_jsonb(version) - 'created_by' - 'created_at',
        jsonb_build_array(jsonb_build_object('concept', 'Período completo de suscripción',
          'amount', version.price, 'net', round(version.price * 100 / 119),
          'vat', version.price - round(version.price * 100 / 119), 'vat_rate', 19))
      );
    end if;
    result := jsonb_build_object('status', 'renewed', 'tenant_id', subscription.tenant_id,
      'subscription_id', subscription.id, 'plan_version_id', version.id,
      'period_starts_on', period_start, 'period_end_exclusive', period_end,
      'invoice_id', invoice_id, 'amount', version.price, 'due_on', deadline,
      'change_status', case when not has_change then null when blocked_reason is not null then 'blocked' else 'applied' end,
      'blocked_reason', blocked_reason);
    delete from public.saas_renewal_failures f where f.subscription_id = subscription.id;
    insert into public.audit_log(tenant_id, actor_id, action, entity_type, entity_id, metadata)
      values(subscription.tenant_id, auth.uid(), 'saas.subscription_renewed', 'saas_subscriptions', subscription.id::text, result);
  exception when others then
    get stacked diagnostics failure_code = returned_sqlstate;
    insert into public.saas_renewal_failures(subscription_id, period_starts_on, attempt_count, next_attempt_at, error_code)
      values(subscription.id, period_start, 1, now() + interval '5 minutes', failure_code)
      on conflict (subscription_id, period_starts_on) do update set
        attempt_count = least(3, public.saas_renewal_failures.attempt_count + 1),
        next_attempt_at = case when public.saas_renewal_failures.attempt_count < 2 then now() + interval '5 minutes' else null end,
        error_code = excluded.error_code;
    result := jsonb_build_object('status', 'failed', 'tenant_id', subscription.tenant_id,
      'subscription_id', subscription.id, 'period_starts_on', period_start, 'error_code', failure_code,
      'message', 'No se renovó el contrato. Revisa fechas, límites programados y condiciones históricas antes de reintentar.');
    insert into public.audit_log(tenant_id, actor_id, action, entity_type, entity_id, metadata)
      values(subscription.tenant_id, auth.uid(), 'saas.renewal_failed', 'saas_subscriptions', subscription.id::text, result);
  end;
  insert into public.saas_renewal_runs(request_id, actor_user_id, payload, tenant_id, subscription_id, status, result)
    values(request_id, auth.uid(), request_payload, subscription.tenant_id, subscription.id, result->>'status', result);
  return result;
end;
$$;

create function public.get_saas_renewal_status(target_tenant uuid default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  perform public.record_saas_privileged_operation(target_tenant, 'saas.renewal_status_read', 'Consultar procesador de renovaciones', 'succeeded');
  select jsonb_build_object(
    'business_date', (now() at time zone 'America/Santiago')::date,
    'last_run_at', (select max(r.occurred_at) from public.saas_renewal_runs r),
    'last_worker_run_at', (select max(r.occurred_at) from public.saas_renewal_runs r
      where r.payload->'subscription_id' = 'null'::jsonb),
    'due_count', (select count(*) from public.saas_subscriptions s where s.status in ('trial','active','past_due','suspended')
      and s.current_period_end_exclusive <= (now() at time zone 'America/Santiago')::date
      and (target_tenant is null or s.tenant_id = target_tenant)),
    'failures', coalesce((select jsonb_agg(to_jsonb(f)) from (
      select s.id as subscription_id, s.tenant_id, t.name as tenant_name, f.period_starts_on,
        f.attempt_count, f.next_attempt_at, f.error_code from public.saas_renewal_failures f
      join public.saas_subscriptions s on s.id = f.subscription_id join public.tenants t on t.id = s.tenant_id
      where (target_tenant is null or s.tenant_id = target_tenant)
        and s.current_period_end_exclusive = f.period_starts_on
      order by f.period_starts_on, s.id limit 50
    ) f), '[]'::jsonb),
    'blocked_changes', coalesce((select jsonb_agg(to_jsonb(c)) from (
      select c.id, c.tenant_id, t.name as tenant_name, c.subscription_id, c.effective_on, c.blocked_reason
      from public.saas_scheduled_plan_changes c join public.tenants t on t.id = c.tenant_id
      where c.status = 'blocked' and (target_tenant is null or c.tenant_id = target_tenant)
      order by c.processed_at desc, c.id limit 50
    ) c), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- Renewal/backfill changes take effect at the service boundary, not the worker's catch-up date.
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
    and old.duration_count is not distinct from new.duration_count then return new; end if;
  event_effective_on := case
    when new.status in ('cancelled','expired') then coalesce(new.ended_on, business_today)
    when tg_op = 'UPDATE' and old.status = 'trial' and new.status = 'active' then coalesce(new.converted_at, business_today)
    when tg_op = 'INSERT' then new.starts_on
    when tg_op = 'UPDATE' and old.current_period_starts_on is distinct from new.current_period_starts_on then new.current_period_starts_on
    else business_today end;
  insert into public.saas_subscription_events(
    tenant_id, subscription_id, previous_status, new_status, price, currency, billing_cycle,
    effective_on, plan_version_id, duration_unit, duration_count
  ) values (
    new.tenant_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status, new.price, new.currency,
    new.billing_cycle, event_effective_on, new.plan_version_id, new.duration_unit, new.duration_count
  );
  return new;
end;
$$;

revoke all on function public.notify_saas_blocked_plan_change(uuid) from public, anon, authenticated;
revoke all on function public.process_saas_subscription_renewal(uuid, uuid, date) from public, anon;
grant execute on function public.process_saas_subscription_renewal(uuid, uuid, date) to authenticated, service_role;
revoke all on function public.get_saas_renewal_status(uuid) from public, anon;
grant execute on function public.get_saas_renewal_status(uuid) to authenticated;
commit;
