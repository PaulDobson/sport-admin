-- Run after migrations 0001-0030. Set real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '2f5b4f4d-52ff-4a10-9f37-2f0a1ce9c0f4', true);

insert into public.tenants (id, name, status) values
  ('e0000000-0000-4000-8000-000000000001', 'Notice Tenant A', 'active'),
  ('e0000000-0000-4000-8000-000000000002', 'Notice Tenant B', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('e0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('e0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');
insert into public.students (id, tenant_id, full_name) values
  ('e0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000001', 'Overdue Student'),
  ('e0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000001', 'Renewing Student');
insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency, billing_cycle, expiration_grace_days
) values (
  'e0000000-0000-4000-8000-000000000031',
  'e0000000-0000-4000-8000-000000000001',
  'Grace Plan', 1000, 30, 'CLP', 'monthly', 5
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
) values
  (
    'e0000000-0000-4000-8000-000000000041',
    'e0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000021',
    'e0000000-0000-4000-8000-000000000031',
    '2026-08-01', '2026-08-30', 'active', 1000, 'CLP', 'monthly', '2026-08-31'
  ),
  (
    'e0000000-0000-4000-8000-000000000042',
    'e0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000022',
    'e0000000-0000-4000-8000-000000000031',
    '2026-09-01', '2026-09-30', 'active', 1000, 'CLP', 'monthly', '2026-09-10'
  );
insert into public.student_membership_payments (
  tenant_id, membership_id, amount, currency, status, paid_at, method, operation_id
) values (
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000042',
  1000, 'CLP', 'paid', '2026-09-01 10:00:00+00', 'transfer',
  'e0000000-0000-4000-8000-000000000061'
);

-- Inside the grace window no collection notice is emitted.
do $$
begin
  if public.evaluate_membership_collection_notices('2026-09-04', 0, 'e0000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'notice emitted before the grace period elapsed';
  end if;
end;
$$;

-- Overdue balance and upcoming renewal each emit one notice.
do $$
declare
  emitted integer;
begin
  emitted := public.evaluate_membership_collection_notices('2026-09-08', 7, 'e0000000-0000-4000-8000-000000000001');
  if emitted <> 2 then
    raise exception 'expected two notices, got %', emitted;
  end if;
  if (
    select count(*) from public.activity_events
    where event_type = 'finance.collection_due'
      and entity_id = 'e0000000-0000-4000-8000-000000000041'
  ) <> 1 then
    raise exception 'overdue membership did not produce a collection notice';
  end if;
  if (
    select count(*) from public.activity_events
    where event_type = 'finance.renewal_due'
      and entity_id = 'e0000000-0000-4000-8000-000000000042'
  ) <> 1 then
    raise exception 'settled membership did not produce a renewal notice';
  end if;
  if (
    select (metadata->>'balance')::numeric from public.activity_events
    where event_type = 'finance.collection_due'
  ) <> 1000 then
    raise exception 'collection notice did not carry the outstanding balance';
  end if;
  if (
    select count(*) from public.activity_events
    where event_type = 'finance.collection_due'
      and metadata->>'student_id' = 'e0000000-0000-4000-8000-000000000021'
      and metadata->>'membership_id' = 'e0000000-0000-4000-8000-000000000041'
      and metadata->>'currency' = 'CLP'
      and metadata->>'due_on' = '2026-08-31'
  ) <> 1 then
    raise exception 'collection notice payload is missing data needed to register the payment';
  end if;
end;
$$;

-- Re-running within the same reference period does not duplicate notices.
do $$
begin
  perform public.evaluate_membership_collection_notices('2026-09-20', 7, 'e0000000-0000-4000-8000-000000000001');
  if (select count(*) from public.activity_events where origin = 'finance') <> 2 then
    raise exception 'notices were duplicated within the same period';
  end if;
  if (select count(*) from public.activity_notifications) <> 2 then
    raise exception 'routed notifications were duplicated within the same period';
  end if;
end;
$$;

-- Only the internal channel is scheduled for delivery.
do $$
begin
  if (
    select count(*)
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    join public.activity_events event
      on event.tenant_id = notification.tenant_id and event.id = notification.event_id
    where event.origin = 'finance'
      and delivery.channel <> 'internal'
  ) <> 0 then
    raise exception 'collection notices must not schedule external channels';
  end if;
  if (
    select count(*)
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    join public.activity_events event
      on event.tenant_id = notification.tenant_id and event.id = notification.event_id
    where event.origin = 'finance'
      and delivery.channel = 'internal'
  ) <> 2 then
    raise exception 'collection notices must schedule the internal channel';
  end if;
end;
$$;

-- A member of another tenant sees neither the notices nor the payments.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.activity_notifications) <> 0 then
    raise exception 'cross tenant user can read collection notices';
  end if;
  if (select count(*) from public.student_membership_payments) <> 0 then
    raise exception 'cross tenant user can read payments';
  end if;
  update public.activity_notifications set status = 'resolved', resolved_at = now();
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'cross tenant user can resolve collection notices';
  end if;
end;
$$;

reset role;
rollback;
