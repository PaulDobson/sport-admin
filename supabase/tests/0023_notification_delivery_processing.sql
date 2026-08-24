-- Run after migration 0025. Set one real auth user UUID below.
begin;

select set_config('test.owner_user', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status)
values ('25000000-0000-4000-8000-000000000001', 'Delivery Tenant', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values (
  '25000000-0000-4000-8000-000000000011',
  '25000000-0000-4000-8000-000000000001',
  current_setting('test.owner_user')::uuid,
  'owner',
  'active'
);

insert into public.activity_events (
  id, tenant_id, operation_id, event_type, severity, origin,
  entity_type, entity_id, title, message, occurred_at
)
values (
  '25000000-0000-4000-8000-000000000021',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000022',
  'attendance.absent',
  'info',
  'operations',
  'class_session_attendance',
  '25000000-0000-4000-8000-000000000023',
  'Absence recorded',
  'Review attendance',
  '2026-08-23T10:00:00Z'
);

insert into public.activity_notifications (
  id, tenant_id, event_id, recipient_user_id, recipient_role
)
values (
  '25000000-0000-4000-8000-000000000031',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000021',
  current_setting('test.owner_user')::uuid,
  'owner'
);

insert into public.notification_deliveries (
  id, tenant_id, activity_notification_id, channel, next_attempt_at
)
values (
  '25000000-0000-4000-8000-000000000041',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000031',
  'email',
  '2026-08-23T10:00:00Z'
);

do $$
declare
  claimed jsonb;
  duplicate_claim jsonb;
  completion_status text;
begin
  claimed := public.claim_notification_delivery('2026-08-23T10:00:00Z');
  if claimed->>'id' <> '25000000-0000-4000-8000-000000000041'
    or (claimed->>'attemptNumber')::integer <> 1
  then
    raise exception 'first notification delivery claim was invalid';
  end if;

  duplicate_claim := public.claim_notification_delivery('2026-08-23T10:00:00Z');
  if duplicate_claim is not null then
    raise exception 'leased delivery was claimed twice';
  end if;

  completion_status := public.complete_notification_delivery(
    '25000000-0000-4000-8000-000000000041',
    1,
    'failed',
    null,
    'provider_timeout',
    true,
    '2026-08-23T10:00:10Z'
  );
  if completion_status <> 'pending' then
    raise exception 'retryable failure did not return to pending';
  end if;

  completion_status := public.complete_notification_delivery(
    '25000000-0000-4000-8000-000000000041',
    1,
    'failed',
    null,
    'provider_timeout',
    true,
    '2026-08-23T10:00:10Z'
  );
  if completion_status <> 'pending' then
    raise exception 'repeated completion was not idempotent';
  end if;
  if (
    select count(*)
    from public.notification_delivery_attempts
    where delivery_id = '25000000-0000-4000-8000-000000000041'
      and attempt_number = 1
  ) <> 1 then
    raise exception 'repeated completion duplicated attempt history';
  end if;

  claimed := public.claim_notification_delivery('2026-08-23T10:02:00Z');
  if claimed->>'id' <> '25000000-0000-4000-8000-000000000041'
    or (claimed->>'attemptNumber')::integer <> 2
  then
    raise exception 'scheduled retry was not claimed';
  end if;

  completion_status := public.complete_notification_delivery(
    '25000000-0000-4000-8000-000000000041',
    2,
    'delivered',
    'provider-reference-1',
    null,
    false,
    '2026-08-23T10:02:05Z'
  );
  if completion_status <> 'delivered' then
    raise exception 'successful retry was not delivered';
  end if;
end;
$$;

insert into public.activity_events (
  id, tenant_id, operation_id, event_type, severity, origin,
  entity_type, entity_id, title, message, occurred_at
)
values (
  '25000000-0000-4000-8000-000000000051',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000052',
  'billing.charge.failed',
  'critical',
  'saas',
  'saas_charge',
  '25000000-0000-4000-8000-000000000053',
  'Charge failed',
  'Review account billing',
  '2026-08-23T11:00:00Z'
);

insert into public.activity_notifications (
  id, tenant_id, event_id, recipient_user_id, recipient_role
)
values (
  '25000000-0000-4000-8000-000000000061',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000051',
  current_setting('test.owner_user')::uuid,
  'owner'
);

insert into public.notification_deliveries (
  id, tenant_id, activity_notification_id, channel, next_attempt_at
)
values (
  '25000000-0000-4000-8000-000000000071',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000061',
  'push',
  '2026-08-23T11:00:00Z'
);

do $$
declare
  claimed jsonb;
  completion_status text;
begin
  claimed := public.claim_notification_delivery('2026-08-23T11:00:00Z');
  completion_status := public.complete_notification_delivery(
    (claimed->>'id')::uuid,
    (claimed->>'attemptNumber')::integer,
    'failed',
    null,
    'invalid_recipient',
    false,
    '2026-08-23T11:00:05Z'
  );
  if completion_status <> 'failed' then
    raise exception 'non-retryable failure did not reach final state';
  end if;
  if exists (
    select 1
    from public.notification_deliveries
    where id = '25000000-0000-4000-8000-000000000071'
      and (status <> 'failed' or next_attempt_at is not null)
  ) then
    raise exception 'final failure retained an invalid retry schedule';
  end if;
end;
$$;

rollback;