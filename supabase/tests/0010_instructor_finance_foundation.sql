-- Run after migrations 0001-0011. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values
  ('a0000000-0000-4000-8000-000000000001', 'Finance Tenant A', 'active'),
  ('a0000000-0000-4000-8000-000000000002', 'Finance Tenant B', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');
insert into public.students (id, tenant_id, full_name) values
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'Finance Student A');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency,
  billing_cycle, benefits, expiration_grace_days
) values (
  'a0000000-0000-4000-8000-000000000031',
  'a0000000-0000-4000-8000-000000000001',
  'Annual Performance', 1200, 365, 'USD', 'annual',
  '["group_classes", "monthly_evaluation"]'::jsonb, 10
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at,
  status, agreed_price, currency, billing_cycle, next_billing_date, past_due_since
) values
  (
    'a0000000-0000-4000-8000-000000000041',
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000021',
    'a0000000-0000-4000-8000-000000000031',
    '2026-08-01', '2027-07-31', 'active', 1200, 'USD', 'annual', '2027-08-01', null
  ),
  (
    'a0000000-0000-4000-8000-000000000042',
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000021',
    'a0000000-0000-4000-8000-000000000031',
    '2025-08-01', '2026-07-31', 'past_due', 1200, 'USD', 'annual', '2026-08-01', '2026-08-01'
  );
insert into public.student_membership_payments (
  id, tenant_id, membership_id, amount, currency, status,
  due_on, paid_at, reference, operation_id
) values (
  'a0000000-0000-4000-8000-000000000051',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000041',
  1200, 'USD', 'paid', '2026-08-01', '2026-08-01 12:00:00+00',
  'receipt-001', 'a0000000-0000-4000-8000-000000000052'
);
insert into public.student_membership_adjustments (
  tenant_id, membership_id, payment_id, kind, amount, currency,
  effective_on, reason, created_by_membership_id
) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000051', 'discount', 100, 'USD', '2026-08-01', 'Launch discount', 'a0000000-0000-4000-8000-000000000011'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000041', null, 'credit', 25, 'USD', '2026-08-02', 'Referral credit', 'a0000000-0000-4000-8000-000000000011'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000051', 'tax', 50, 'USD', '2026-08-01', 'Local tax', 'a0000000-0000-4000-8000-000000000011');
insert into public.instructor_financial_events (
  tenant_id, entity_type, entity_id, event_type, amount, currency,
  actor_membership_id, operation_id, occurred_at, metadata
) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'membership', 'a0000000-0000-4000-8000-000000000041', 'membership_activated',
    1200, 'USD', 'a0000000-0000-4000-8000-000000000011',
    'a0000000-0000-4000-8000-000000000061', '2026-08-01 12:00:00+00',
    '{"billing_cycle":"annual"}'::jsonb
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'membership', 'a0000000-0000-4000-8000-000000000042', 'membership_past_due',
    1200, 'USD', 'a0000000-0000-4000-8000-000000000011',
    'a0000000-0000-4000-8000-000000000062', '2026-08-02 12:00:00+00',
    '{"past_due_since":"2026-08-01"}'::jsonb
  );

do $$
declare
  affected integer;
begin
  if (select count(*) from public.membership_plans where billing_cycle = 'annual' and currency = 'USD') <> 1 then
    raise exception 'plan currency and periodicity were not stored';
  end if;
  if (select count(*) from public.student_memberships where status = 'active' and next_billing_date = '2027-08-01') <> 1 then
    raise exception 'membership state and billing date were not stored';
  end if;
  if (select count(*) from public.student_memberships where status = 'past_due' and past_due_since = '2026-08-01') <> 1 then
    raise exception 'past-due membership state was not stored';
  end if;
  if (select count(*) from public.student_membership_adjustments) <> 3 then
    raise exception 'discount, credit, and tax adjustments were not stored';
  end if;
  if (select count(*) from public.instructor_financial_events) <> 2 then
    raise exception 'financial state events were not stored';
  end if;

  update public.instructor_financial_events set event_type = 'rewritten';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'financial event history must be immutable'; end if;

  begin
    insert into public.membership_plans (
      tenant_id, name, price, duration_days, currency, billing_cycle
    ) values (
      'a0000000-0000-4000-8000-000000000001', 'Invalid currency', 10, 30, 'usd', 'monthly'
    );
    raise exception 'lowercase currency was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.membership_plans (
      tenant_id, name, price, duration_days, currency, billing_cycle
    ) values (
      'a0000000-0000-4000-8000-000000000001', 'Invalid cycle', 10, 7, 'USD', 'weekly'
    );
    raise exception 'unsupported billing cycle was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.student_membership_adjustments (
      tenant_id, membership_id, kind, amount, currency,
      effective_on, reason, created_by_membership_id
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000041',
      'credit', -1, 'USD', '2026-08-02', 'Invalid credit',
      'a0000000-0000-4000-8000-000000000011'
    );
    raise exception 'negative adjustment was accepted';
  exception when check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if (select count(*) from public.membership_plans) <> 0
    or (select count(*) from public.student_memberships) <> 0
    or (select count(*) from public.student_membership_payments) <> 0
    or (select count(*) from public.student_membership_adjustments) <> 0
    or (select count(*) from public.instructor_financial_events) <> 0 then
    raise exception 'cross-tenant financial data leaked';
  end if;

  begin
    insert into public.student_membership_payments (
      tenant_id, membership_id, amount, currency, operation_id
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000041',
      10, 'USD', 'a0000000-0000-4000-8000-000000000063'
    );
    raise exception 'cross-tenant payment insert succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
declare
  expected_table text;
begin
  foreach expected_table in array array[
    'membership_plans',
    'student_memberships',
    'student_membership_payments',
    'student_membership_adjustments',
    'instructor_financial_events'
  ] loop
    if not exists (
      select 1 from pg_class table_definition
      join pg_namespace schema_definition
        on schema_definition.oid = table_definition.relnamespace
      where schema_definition.nspname = 'public'
        and table_definition.relname = expected_table
        and table_definition.relrowsecurity
    ) then
      raise exception 'financial table missing RLS: %', expected_table;
    end if;
  end loop;
end;
$$;

rollback;