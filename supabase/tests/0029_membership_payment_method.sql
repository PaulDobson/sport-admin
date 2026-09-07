-- Run after migrations 0001-0030. Set a real auth user UUID below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status) values
  ('d0000000-0000-4000-8000-000000000001', 'Method Tenant', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active');
insert into public.students (id, tenant_id, full_name) values
  ('d0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000001', 'Method Student');
insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency, billing_cycle, expiration_grace_days
) values (
  'd0000000-0000-4000-8000-000000000031',
  'd0000000-0000-4000-8000-000000000001',
  'Method Plan', 1000, 30, 'CLP', 'monthly', 0
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
) values (
  'd0000000-0000-4000-8000-000000000041',
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000021',
  'd0000000-0000-4000-8000-000000000031',
  '2026-08-01', '2026-08-30', 'active', 1000, 'CLP', 'monthly', '2026-08-31'
);

do $$
begin
  if exists (
    select 1
    from pg_proc proc
    join pg_namespace space on space.oid = proc.pronamespace
    where space.nspname = 'public'
      and proc.proname = 'record_membership_payment'
      and pg_get_function_identity_arguments(proc.oid)
        = 'uuid, uuid, numeric, text, timestamp with time zone, text, uuid, uuid, jsonb'
  ) then
    raise exception 'legacy record_membership_payment signature still exists';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

do $$
declare
  first_payment uuid;
  repeated_payment uuid;
  stored_method text;
begin
  first_payment := public.record_membership_payment(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000041',
    400, 'CLP', '2026-09-01 12:00:00+00', 'transfer-400',
    'd0000000-0000-4000-8000-000000000011',
    'd0000000-0000-4000-8000-000000000051',
    'transfer', '[]'::jsonb
  );
  repeated_payment := public.record_membership_payment(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000041',
    400, 'CLP', '2026-09-01 12:00:00+00', 'transfer-400',
    'd0000000-0000-4000-8000-000000000011',
    'd0000000-0000-4000-8000-000000000051',
    'transfer', '[]'::jsonb
  );

  if first_payment <> repeated_payment then
    raise exception 'idempotent payment id changed';
  end if;
  if (select count(*) from public.student_membership_payments) <> 1 then
    raise exception 'partial payment was duplicated';
  end if;

  select method into stored_method
  from public.student_membership_payments
  where id = first_payment;
  if stored_method <> 'transfer' then
    raise exception 'payment method was not stored';
  end if;

  if (select amount from public.student_membership_payments where id = first_payment) <> 400 then
    raise exception 'partial payment amount changed';
  end if;

  begin
    perform public.record_membership_payment(
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000041',
      100, 'CLP', now(), null,
      'd0000000-0000-4000-8000-000000000011',
      'd0000000-0000-4000-8000-000000000052',
      'crypto', '[]'::jsonb
    );
    raise exception 'invalid payment method was accepted';
  exception when check_violation then null;
  end;
end;
$$;

reset role;

-- A collection notice exists while the balance is outstanding.
do $$
declare
  emitted integer;
begin
  emitted := public.evaluate_membership_collection_notices('2026-09-02', 7, 'd0000000-0000-4000-8000-000000000001');
  if emitted <> 1 then
    raise exception 'expected one collection notice, got %', emitted;
  end if;
  if (
    select count(*)
    from public.activity_notifications notification
    join public.activity_events event
      on event.tenant_id = notification.tenant_id and event.id = notification.event_id
    where event.event_type = 'finance.collection_due'
      and notification.status = 'pending'
  ) <> 1 then
    raise exception 'collection notice was not routed as pending';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

-- A further partial payment keeps the notice pending.
do $$
begin
  perform public.record_membership_payment(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000041',
    100, 'CLP', '2026-09-03 12:00:00+00', 'cash-100',
    'd0000000-0000-4000-8000-000000000011',
    'd0000000-0000-4000-8000-000000000053',
    'cash', '[]'::jsonb
  );
  if (
    select count(*) from public.activity_notifications where status = 'pending'
  ) <> 1 then
    raise exception 'partial payment must not resolve the collection notice';
  end if;
end;
$$;

-- The payment that settles the balance resolves the notice in the same transaction.
do $$
begin
  perform public.record_membership_payment(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000041',
    500, 'CLP', '2026-09-04 12:00:00+00', 'card-500',
    'd0000000-0000-4000-8000-000000000011',
    'd0000000-0000-4000-8000-000000000054',
    'card', '[]'::jsonb
  );
  if (
    select count(*) from public.activity_notifications where status = 'pending'
  ) <> 0 then
    raise exception 'settled balance must resolve the collection notice';
  end if;
  if (
    select count(*) from public.activity_notifications
    where status = 'resolved' and resolved_at is not null
  ) <> 1 then
    raise exception 'resolved notice must keep its history';
  end if;
end;
$$;

reset role;

do $$
begin
  if (
    select balance from public.membership_outstanding_balances('d0000000-0000-4000-8000-000000000001')
  ) <> 0 then
    raise exception 'balance must reach zero after the settling payment';
  end if;
end;
$$;

rollback;
