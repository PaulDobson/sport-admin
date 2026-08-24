-- Run after migration 0026. Set one real auth user UUID below.
begin;

select set_config('test.owner_user', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status)
values
  ('26000000-0000-4000-8000-000000000001', 'Push Enabled Tenant', 'active'),
  ('26000000-0000-4000-8000-000000000002', 'Push Disabled Tenant', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '26000000-0000-4000-8000-000000000011',
    '26000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'owner',
    'active'
  ),
  (
    '26000000-0000-4000-8000-000000000012',
    '26000000-0000-4000-8000-000000000002',
    current_setting('test.owner_user')::uuid,
    'owner',
    'active'
  );

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle,
  max_students, max_users, features, status
)
values
  (
    '26000000-0000-4000-8000-000000000021',
    'push-enabled-test',
    'Push Enabled Test',
    100,
    'USD',
    'monthly',
    100,
    10,
    '["push"]'::jsonb,
    'active'
  ),
  (
    '26000000-0000-4000-8000-000000000022',
    'push-disabled-test',
    'Push Disabled Test',
    50,
    'USD',
    'monthly',
    100,
    10,
    '["reports"]'::jsonb,
    'active'
  );

insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on,
  current_period_starts_on, current_period_ends_on, next_billing_date,
  price, currency, billing_cycle
)
values
  (
    '26000000-0000-4000-8000-000000000031',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000021',
    'active',
    'paid',
    current_date,
    current_date,
    current_date + 30,
    current_date + 30,
    100,
    'USD',
    'monthly'
  ),
  (
    '26000000-0000-4000-8000-000000000032',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000022',
    'active',
    'paid',
    current_date,
    current_date,
    current_date + 30,
    current_date + 30,
    50,
    'USD',
    'monthly'
  );

insert into public.saas_limits (
  id, tenant_id, subscription_id, plan_id, max_students, max_users,
  features, effective_from
)
values
  (
    '26000000-0000-4000-8000-000000000041',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000031',
    '26000000-0000-4000-8000-000000000021',
    100,
    10,
    '["push"]'::jsonb,
    current_date
  ),
  (
    '26000000-0000-4000-8000-000000000042',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000032',
    '26000000-0000-4000-8000-000000000022',
    100,
    10,
    '["reports"]'::jsonb,
    current_date
  );

insert into public.activity_events (
  id, tenant_id, operation_id, event_type, severity, origin,
  entity_type, entity_id, title, message, occurred_at
)
values
  (
    '26000000-0000-4000-8000-000000000051',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000052',
    'attendance.absent',
    'info',
    'operations',
    'class_session_attendance',
    '26000000-0000-4000-8000-000000000053',
    'Absence recorded',
    'Review attendance',
    now()
  ),
  (
    '26000000-0000-4000-8000-000000000054',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000055',
    'attendance.absent',
    'info',
    'operations',
    'class_session_attendance',
    '26000000-0000-4000-8000-000000000056',
    'Absence recorded',
    'Review attendance',
    now()
  );

insert into public.activity_notifications (
  id, tenant_id, event_id, recipient_user_id, recipient_role
)
values
  (
    '26000000-0000-4000-8000-000000000061',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000051',
    current_setting('test.owner_user')::uuid,
    'owner'
  ),
  (
    '26000000-0000-4000-8000-000000000062',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000054',
    current_setting('test.owner_user')::uuid,
    'owner'
  );

insert into public.notification_deliveries (
  id, tenant_id, activity_notification_id, channel, next_attempt_at
)
values
  (
    '26000000-0000-4000-8000-000000000071',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000061',
    'internal',
    now()
  ),
  (
    '26000000-0000-4000-8000-000000000072',
    '26000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000061',
    'push',
    now()
  ),
  (
    '26000000-0000-4000-8000-000000000073',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000062',
    'internal',
    now()
  ),
  (
    '26000000-0000-4000-8000-000000000074',
    '26000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000062',
    'push',
    now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_user'), true);

do $$
begin
  if not public.can_use_saas_feature(
    '26000000-0000-4000-8000-000000000001',
    'push',
    current_date
  ) then
    raise exception 'push feature was not enabled for entitled tenant';
  end if;
  if public.can_use_saas_feature(
    '26000000-0000-4000-8000-000000000002',
    'push',
    current_date
  ) then
    raise exception 'push feature was enabled without plan entitlement';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.notification_deliveries
    where id = '26000000-0000-4000-8000-000000000072'
      and channel = 'push'
  ) then
    raise exception 'entitled push delivery was not created';
  end if;
  if exists (
    select 1 from public.notification_deliveries
    where id = '26000000-0000-4000-8000-000000000074'
  ) then
    raise exception 'push delivery bypassed feature flag';
  end if;
  if (
    select count(*) from public.notification_deliveries
    where id in (
      '26000000-0000-4000-8000-000000000071',
      '26000000-0000-4000-8000-000000000073'
    ) and channel = 'internal'
  ) <> 2 then
    raise exception 'internal fallback was not preserved';
  end if;
end;
$$;

rollback;
