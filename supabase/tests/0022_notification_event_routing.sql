-- Run after migration 0024. Set two real auth user UUIDs below.
begin;

select set_config('test.owner_user', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.instructor_user', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('24000000-0000-4000-8000-000000000001', 'Routing Tenant A', 'active'),
  ('24000000-0000-4000-8000-000000000002', 'Routing Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '24000000-0000-4000-8000-000000000011',
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'owner',
    'active'
  ),
  (
    '24000000-0000-4000-8000-000000000012',
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.instructor_user')::uuid,
    'instructor',
    'active'
  );

insert into public.notification_preferences (
  tenant_id, user_id, event_type, channel, enabled
)
values
  (
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'membership.expired',
    'email',
    false
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'billing.charge.failed',
    'email',
    true
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.instructor_user')::uuid,
    'attendance.absent',
    'push',
    true
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    current_setting('test.instructor_user')::uuid,
    'health.authorized',
    'push',
    true
  );

insert into public.locations (id, tenant_id, name, type, status)
values (
  '24000000-0000-4000-8000-000000000021',
  '24000000-0000-4000-8000-000000000001',
  'Routing Location',
  'external_gym',
  'active'
);

insert into public.students (id, tenant_id, full_name, status)
values (
  '24000000-0000-4000-8000-000000000022',
  '24000000-0000-4000-8000-000000000001',
  'Routing Student',
  'active'
);

insert into public.disciplines (id, tenant_id, name)
values (
  '24000000-0000-4000-8000-000000000023',
  '24000000-0000-4000-8000-000000000001',
  'Routing Discipline'
);

insert into public.class_templates (
  id, tenant_id, discipline_id, name, capacity
)
values (
  '24000000-0000-4000-8000-000000000024',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000023',
  'Routing Class',
  20
);

insert into public.class_schedules (
  id, tenant_id, class_template_id, location_id,
  instructor_membership_id, day_of_week, starts_at, ends_at, timezone
)
values (
  '24000000-0000-4000-8000-000000000025',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000024',
  '24000000-0000-4000-8000-000000000021',
  '24000000-0000-4000-8000-000000000012',
  1,
  '10:00',
  '11:00',
  'UTC'
);

insert into public.class_sessions (
  id, tenant_id, class_schedule_id, class_template_id, location_id,
  instructor_membership_id, starts_at, ends_at, timezone, capacity
)
values (
  '24000000-0000-4000-8000-000000000026',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000025',
  '24000000-0000-4000-8000-000000000024',
  '24000000-0000-4000-8000-000000000021',
  '24000000-0000-4000-8000-000000000012',
  now() + interval '1 day',
  now() + interval '1 day 1 hour',
  'UTC',
  20
);

insert into public.session_enrollments (
  id, tenant_id, session_id, student_id, status
)
values (
  '24000000-0000-4000-8000-000000000027',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000026',
  '24000000-0000-4000-8000-000000000022',
  'confirmed'
);

insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency,
  billing_cycle, benefits, expiration_grace_days, status
)
values (
  '24000000-0000-4000-8000-000000000031',
  '24000000-0000-4000-8000-000000000001',
  'Routing Membership',
  40,
  30,
  'USD',
  'monthly',
  '[]',
  0,
  'active'
);

insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
)
values (
  '24000000-0000-4000-8000-000000000032',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000022',
  '24000000-0000-4000-8000-000000000031',
  current_date - 30,
  current_date,
  'active',
  40,
  'USD',
  'monthly',
  current_date
);

update public.student_memberships
set status = 'past_due', past_due_since = current_date
where id = '24000000-0000-4000-8000-000000000032';

update public.student_memberships
set status = 'expired'
where id = '24000000-0000-4000-8000-000000000032';

insert into public.class_session_attendance (
  id, tenant_id, session_id, student_id, recorded_by_membership_id,
  status, operation_id
)
values (
  '24000000-0000-4000-8000-000000000041',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000026',
  '24000000-0000-4000-8000-000000000022',
  '24000000-0000-4000-8000-000000000012',
  'absent',
  '24000000-0000-4000-8000-000000000042'
);

insert into public.student_alerts (
  id, tenant_id, student_id, category, severity, reason,
  operational_action, period_start, period_end, deduplication_key
)
values (
  '24000000-0000-4000-8000-000000000043',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000022',
  'abandonment',
  'yellow',
  'Routing abandonment reason',
  'Routing follow-up action',
  current_date - 7,
  current_date,
  'routing-abandonment'
);

insert into public.health_restrictions (
  id, tenant_id, student_id, description, operational_action,
  severity, source, starts_on, status
)
values (
  '24000000-0000-4000-8000-000000000044',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000022',
  'MEDICAL_SECRET_DESCRIPTION',
  'MEDICAL_SECRET_ACTION',
  'red',
  'authorized-test',
  current_date,
  'active'
);

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle,
  max_students, max_users, features, status
)
values (
  '24000000-0000-4000-8000-000000000051',
  'routing-plan',
  'Routing SaaS Plan',
  100,
  'USD',
  'monthly',
  100,
  10,
  '[]',
  'active'
);

insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on,
  current_period_starts_on, current_period_ends_on, next_billing_date,
  price, currency, billing_cycle
)
values (
  '24000000-0000-4000-8000-000000000052',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000051',
  'active',
  'paid',
  current_date - 30,
  current_date - 30,
  current_date,
  current_date + 1,
  100,
  'USD',
  'monthly'
);

insert into public.saas_invoices (
  id, tenant_id, subscription_id, invoice_number, status,
  amount, currency, period_starts_on, period_ends_on, due_on, issued_at
)
values (
  '24000000-0000-4000-8000-000000000053',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000052',
  'ROUTING-001',
  'open',
  100,
  'USD',
  current_date - 30,
  current_date,
  current_date,
  now()
);

insert into public.saas_charges (
  id, tenant_id, invoice_id, amount, currency, status, operation_id
)
values (
  '24000000-0000-4000-8000-000000000054',
  '24000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000053',
  100,
  'USD',
  'pending',
  '24000000-0000-4000-8000-000000000055'
);

update public.saas_charges
set status = 'failed'
where id = '24000000-0000-4000-8000-000000000054';

update public.saas_charges
set status = 'succeeded'
where id = '24000000-0000-4000-8000-000000000054';

update public.saas_subscriptions
set status = 'past_due', payment_status = 'failed'
where id = '24000000-0000-4000-8000-000000000052';

update public.saas_subscriptions
set status = 'suspended'
where id = '24000000-0000-4000-8000-000000000052';

do $$
declare
  duplicate_operation uuid;
  duplicate_event uuid;
begin
  select operation_id into duplicate_operation
  from public.activity_events
  where tenant_id = '24000000-0000-4000-8000-000000000001'
    and event_type = 'attendance.absent';

  duplicate_event := public.create_routed_activity_event(
    '24000000-0000-4000-8000-000000000001',
    duplicate_operation,
    'attendance.absent',
    'info',
    'operations',
    'class_session_attendance',
    '24000000-0000-4000-8000-000000000041',
    'Duplicate',
    'Duplicate',
    '{}'::jsonb,
    now(),
    '24000000-0000-4000-8000-000000000022',
    '24000000-0000-4000-8000-000000000026',
    true
  );

  if duplicate_event is null then
    raise exception 'idempotent event lookup failed';
  end if;
end;
$$;

do $$
declare
  missing_event_types text[];
begin
  select array_agg(expected.event_type order by expected.event_type)
  into missing_event_types
  from unnest(array[
    'membership.expired',
    'membership.past_due',
    'attendance.absent',
    'abandonment.risk',
    'health.authorized',
    'billing.charge.succeeded',
    'billing.charge.failed',
    'billing.subscription.past_due',
    'billing.subscription.suspended'
  ]) as expected(event_type)
  where not exists (
    select 1
    from public.activity_events event
    where event.tenant_id = '24000000-0000-4000-8000-000000000001'
      and event.event_type = expected.event_type
  );

  if missing_event_types is not null then
    raise exception 'missing routed event transitions: %', missing_event_types;
  end if;

  if exists (
    select 1
    from public.activity_events
    where tenant_id = '24000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'event leaked to another tenant';
  end if;

  if exists (
    select 1
    from public.activity_events event
    where event.event_type = 'health.authorized'
      and (
        event.title ilike '%MEDICAL_SECRET%'
        or event.message ilike '%MEDICAL_SECRET%'
        or event.metadata::text ilike '%MEDICAL_SECRET%'
      )
  ) then
    raise exception 'medical detail leaked into activity payload';
  end if;

  if not exists (
    select 1
    from public.activity_notifications notification
    join public.activity_events event
      on event.tenant_id = notification.tenant_id
     and event.id = notification.event_id
    where event.event_type = 'health.authorized'
      and notification.recipient_user_id = current_setting('test.instructor_user')::uuid
      and notification.recipient_role = 'instructor'
  ) then
    raise exception 'scoped instructor did not receive health event';
  end if;

  if exists (
    select 1
    from public.activity_notifications notification
    join public.activity_events event
      on event.tenant_id = notification.tenant_id
     and event.id = notification.event_id
    where event.origin = 'saas'
      and notification.recipient_role = 'instructor'
  ) then
    raise exception 'instructor received owner-only SaaS billing event';
  end if;

  if not exists (
    select 1
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    join public.activity_events event
      on event.tenant_id = notification.tenant_id
     and event.id = notification.event_id
    where event.event_type = 'attendance.absent'
      and notification.recipient_user_id = current_setting('test.instructor_user')::uuid
      and delivery.channel = 'push'
  ) then
    raise exception 'enabled push preference was not routed';
  end if;

  if exists (
    select 1
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    join public.activity_events event
      on event.tenant_id = notification.tenant_id
     and event.id = notification.event_id
    where event.event_type = 'membership.expired'
      and notification.recipient_user_id = current_setting('test.owner_user')::uuid
      and delivery.channel = 'email'
  ) then
    raise exception 'disabled email preference was routed';
  end if;

  if not exists (
    select 1
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    join public.activity_events event
      on event.tenant_id = notification.tenant_id
     and event.id = notification.event_id
    where event.event_type = 'billing.charge.failed'
      and notification.recipient_user_id = current_setting('test.owner_user')::uuid
      and delivery.channel = 'email'
  ) then
    raise exception 'enabled billing email preference was not routed';
  end if;

  if exists (
    select notification.tenant_id
    from public.activity_notifications notification
    join public.activity_events event on event.id = notification.event_id
    where notification.tenant_id <> event.tenant_id
  ) then
    raise exception 'notification tenant does not match event tenant';
  end if;
end;
$$;

rollback;
