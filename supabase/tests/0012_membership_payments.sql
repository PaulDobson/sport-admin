-- Run after migrations 0001-0013. Set a real auth user UUID below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status) values
  ('c0000000-0000-4000-8000-000000000001', 'Payment Tenant', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active');
insert into public.students (id, tenant_id, full_name) values
  ('c0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 'Payment Student');
insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency, billing_cycle
) values (
  'c0000000-0000-4000-8000-000000000031',
  'c0000000-0000-4000-8000-000000000001',
  'Payment Plan', 1000, 30, 'USD', 'monthly'
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
) values (
  'c0000000-0000-4000-8000-000000000041',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000021',
  'c0000000-0000-4000-8000-000000000031',
  '2026-08-01', '2026-08-30', 'active', 1000, 'USD', 'monthly', '2026-08-31'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

do $$
declare
  first_payment uuid;
  repeated_payment uuid;
  adjusted_amount numeric;
  paid_amount numeric;
begin
  first_payment := public.record_membership_payment(
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000041',
    500, 'USD', '2026-08-22 12:00:00+00', 'receipt-500',
    'c0000000-0000-4000-8000-000000000011',
    'c0000000-0000-4000-8000-000000000051',
    '[
      {"kind":"discount","amount":100,"reason":"Launch discount"},
      {"kind":"credit","amount":50,"reason":"Referral credit"},
      {"kind":"tax","amount":30,"reason":"Local tax"}
    ]'::jsonb
  );
  repeated_payment := public.record_membership_payment(
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000041',
    500, 'USD', '2026-08-22 12:00:00+00', 'receipt-500',
    'c0000000-0000-4000-8000-000000000011',
    'c0000000-0000-4000-8000-000000000051', '[]'::jsonb
  );

  if first_payment <> repeated_payment then raise exception 'idempotent payment id changed'; end if;
  if (select count(*) from public.student_membership_payments) <> 1 then raise exception 'payment was duplicated'; end if;
  if (select count(*) from public.student_membership_adjustments) <> 3 then raise exception 'adjustments were duplicated or lost'; end if;
  if (select count(*) from public.instructor_financial_events where event_type = 'payment_recorded') <> 1 then raise exception 'payment event was duplicated or lost'; end if;

  select
    1000 + coalesce(sum(case when kind = 'tax' then amount else -amount end), 0)
  into adjusted_amount
  from public.student_membership_adjustments
  where membership_id = 'c0000000-0000-4000-8000-000000000041';
  select coalesce(sum(amount), 0) into paid_amount
  from public.student_membership_payments
  where membership_id = 'c0000000-0000-4000-8000-000000000041' and status = 'paid';
  if adjusted_amount <> 880 or paid_amount <> 500 or adjusted_amount - paid_amount <> 380 then
    raise exception 'unexpected adjusted amount or balance';
  end if;

  begin
    perform public.record_membership_payment(
      'c0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000041',
      10, 'EUR', now(), null,
      'c0000000-0000-4000-8000-000000000011',
      'c0000000-0000-4000-8000-000000000052', '[]'::jsonb
    );
    raise exception 'currency mismatch was accepted';
  exception when check_violation then null;
  end;
end;
$$;

do $$
declare
  affected integer;
begin
  update public.instructor_financial_events set event_type = 'rewritten';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'financial events must remain immutable'; end if;
  update public.student_membership_adjustments set amount = 1;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'adjustments must remain immutable'; end if;
end;
$$;

reset role;
rollback;