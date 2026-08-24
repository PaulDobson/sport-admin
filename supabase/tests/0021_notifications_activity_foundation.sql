-- Run after migration 0023. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('23000000-0000-4000-8000-000000000001', 'Notification Tenant A', 'active'),
  ('23000000-0000-4000-8000-000000000002', 'Notification Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '23000000-0000-4000-8000-000000000011',
    '23000000-0000-4000-8000-000000000001',
    current_setting('test.user_a')::uuid,
    'owner',
    'active'
  ),
  (
    '23000000-0000-4000-8000-000000000012',
    '23000000-0000-4000-8000-000000000002',
    current_setting('test.user_b')::uuid,
    'owner',
    'active'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.notification_preferences (
  id,
  tenant_id,
  user_id,
  event_type,
  channel,
  enabled
)
values (
  '23000000-0000-4000-8000-000000000021',
  '23000000-0000-4000-8000-000000000001',
  current_setting('test.user_a')::uuid,
  'membership.expiring',
  'email',
  false
);

do $$
begin
  begin
    insert into public.notification_preferences (
      tenant_id, user_id, event_type, channel
    ) values (
      '23000000-0000-4000-8000-000000000002',
      current_setting('test.user_b')::uuid,
      'membership.expiring',
      'email'
    );
    raise exception 'cross-tenant preference insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

insert into public.activity_events (
  id, tenant_id, operation_id, event_type, severity, origin,
  entity_type, entity_id, title, message, occurred_at
)
values
  (
    '23000000-0000-4000-8000-000000000031',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000032',
    'membership.expiring', 'warning', 'finance', 'student_membership',
    '23000000-0000-4000-8000-000000000033',
    'Membership expiring', 'Review the upcoming expiration', now()
  ),
  (
    '23000000-0000-4000-8000-000000000034',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000035',
    'attendance.absence', 'info', 'operations', 'attendance',
    '23000000-0000-4000-8000-000000000036',
    'Absence recorded', 'Review attendance', now()
  ),
  (
    '23000000-0000-4000-8000-000000000037',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000038',
    'billing.payment_failed', 'critical', 'saas', 'saas_charge',
    '23000000-0000-4000-8000-000000000039',
    'Payment failed', 'Review billing status', now()
  ),
  (
    '23000000-0000-4000-8000-00000000003a',
    '23000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-00000000003b',
    'membership.expiring', 'warning', 'finance', 'student_membership',
    '23000000-0000-4000-8000-00000000003c',
    'Tenant B event', 'Must remain isolated', now()
  );

do $$
begin
  begin
    insert into public.activity_events (
      tenant_id, operation_id, event_type, severity, origin,
      entity_type, entity_id, title, message, occurred_at
    ) values (
      '23000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000032',
      'membership.expiring', 'warning', 'finance', 'student_membership',
      gen_random_uuid(), 'Duplicate', 'Must be rejected', now()
    );
    raise exception 'duplicate operation id unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

insert into public.activity_notifications (
  id, tenant_id, event_id, recipient_user_id, recipient_role
)
values
  (
    '23000000-0000-4000-8000-000000000041',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000031',
    current_setting('test.user_a')::uuid,
    'owner'
  ),
  (
    '23000000-0000-4000-8000-000000000042',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000034',
    current_setting('test.user_a')::uuid,
    'owner'
  ),
  (
    '23000000-0000-4000-8000-000000000043',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000037',
    current_setting('test.user_a')::uuid,
    'owner'
  ),
  (
    '23000000-0000-4000-8000-000000000044',
    '23000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-00000000003a',
    current_setting('test.user_b')::uuid,
    'owner'
  );

insert into public.notification_deliveries (
  id, tenant_id, activity_notification_id, channel, status,
  attempt_count, max_attempts, next_attempt_at, delivered_at, last_error_code
)
values
  (
    '23000000-0000-4000-8000-000000000051',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000041',
    'internal', 'pending', 0, 3, now(), null, null
  ),
  (
    '23000000-0000-4000-8000-000000000052',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000042',
    'email', 'delivered', 1, 3, null, now(), null
  ),
  (
    '23000000-0000-4000-8000-000000000053',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000043',
    'push', 'failed', 3, 3, null, null, 'provider_unavailable'
  ),
  (
    '23000000-0000-4000-8000-000000000054',
    '23000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000044',
    'internal', 'pending', 0, 3, now(), null, null
  );

insert into public.notification_delivery_attempts (
  id, tenant_id, delivery_id, attempt_number, status, error_code, completed_at
)
values
  (
    '23000000-0000-4000-8000-000000000061',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000052',
    1, 'delivered', null, now()
  ),
  (
    '23000000-0000-4000-8000-000000000062',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000053',
    1, 'failed', 'provider_unavailable', now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

select public.resolve_activity_notification(
  '23000000-0000-4000-8000-000000000041'
);

do $$
begin
  if (select count(*) from public.notification_preferences) <> 1 then
    raise exception 'user preference was not preserved';
  end if;
  if (select count(*) from public.activity_notifications) <> 3 then
    raise exception 'activity center did not isolate the recipient';
  end if;
  if not exists (
    select 1 from public.activity_notifications
    where id = '23000000-0000-4000-8000-000000000041'
      and status = 'resolved'
      and resolved_at is not null
  ) then
    raise exception 'resolved activity was not preserved in history';
  end if;
  if (select count(*) from public.notification_deliveries where status = 'pending') <> 1 then
    raise exception 'pending delivery state missing';
  end if;
  if (select count(*) from public.notification_deliveries where status = 'delivered') <> 1 then
    raise exception 'delivered delivery state missing';
  end if;
  if (select count(*) from public.notification_deliveries where status = 'failed') <> 1 then
    raise exception 'failed delivery state missing';
  end if;
  if (select count(*) from public.notification_delivery_attempts) <> 2 then
    raise exception 'delivery attempts were not visible to their recipient';
  end if;
end;
$$;

reset role;

do $$
begin
  begin
    update public.notification_delivery_attempts
    set error_code = 'changed'
    where id = '23000000-0000-4000-8000-000000000062';
    raise exception 'delivery attempt history unexpectedly changed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if (select count(*) from public.activity_notifications) <> 1 then
    raise exception 'tenant B activity center scope is incorrect';
  end if;
  if exists (
    select 1 from public.activity_events
    where tenant_id = '23000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'cross-tenant activity event was exposed';
  end if;
  if exists (
    select 1 from public.notification_deliveries
    where tenant_id = '23000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'cross-tenant delivery was exposed';
  end if;
end;
$$;

reset role;
rollback;