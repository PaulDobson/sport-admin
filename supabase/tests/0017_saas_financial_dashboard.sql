-- Run after migrations 0001-0018. Set two real auth user UUIDs below.
begin;

select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.platform_admin', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
set local timezone = 'America/Santiago';

insert into public.tenants (id, name, status) values
  ('b1000000-0000-4000-8000-000000000001', 'Monthly Tenant', 'active'),
  ('b1000000-0000-4000-8000-000000000002', 'Annual Tenant', 'active'),
  ('b1000000-0000-4000-8000-000000000003', 'Converted Trial', 'active'),
  ('b1000000-0000-4000-8000-000000000004', 'Open Trial', 'trial'),
  ('b1000000-0000-4000-8000-000000000005', 'Churned Tenant', 'cancelled'),
  ('b1000000-0000-4000-8000-000000000006', 'Euro Tenant', 'active'),
  ('b1000000-0000-4000-8000-000000000007', 'Suspended Tenant', 'suspended');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values (
  'b1000000-0000-4000-8000-000000000011',
  'b1000000-0000-4000-8000-000000000001',
  current_setting('test.owner')::uuid, 'owner', 'active'
);
insert into public.platform_admins (id)
values (current_setting('test.platform_admin')::uuid)
on conflict (id) do nothing;

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle, max_students, max_users
) values
  ('b1000000-0000-4000-8000-000000000021', 'metrics-usd', 'Metrics USD', 120, 'USD', 'monthly', 100, 10),
  ('b1000000-0000-4000-8000-000000000022', 'metrics-eur', 'Metrics EUR', 600, 'EUR', 'semiannual', 100, 10);

insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on, trial_ends_on,
  current_period_starts_on, current_period_ends_on, ended_on,
  price, currency, billing_cycle, converted_at
) values
  ('b1000000-0000-4000-8000-000000000031', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000021', 'active', 'paid', '2026-07-01', null, '2026-08-01', '2026-08-31', null, 120, 'USD', 'monthly', null),
  ('b1000000-0000-4000-8000-000000000032', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000021', 'active', 'paid', '2026-07-01', null, '2026-01-01', '2026-12-31', null, 1200, 'USD', 'annual', null),
  ('b1000000-0000-4000-8000-000000000033', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000021', 'trial', 'not_due', '2026-08-01', '2026-08-10', '2026-08-01', '2026-08-10', null, 300, 'USD', 'quarterly', '2026-08-08'),
  ('b1000000-0000-4000-8000-000000000034', 'b1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000021', 'trial', 'not_due', '2026-08-01', '2026-08-20', '2026-08-01', '2026-08-20', null, 60, 'USD', 'monthly', null),
  ('b1000000-0000-4000-8000-000000000035', 'b1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000021', 'cancelled', 'paid', '2026-07-01', null, '2026-08-01', '2026-08-15', '2026-08-15', 80, 'USD', 'monthly', null),
  ('b1000000-0000-4000-8000-000000000036', 'b1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000022', 'active', 'paid', '2026-07-01', null, '2026-07-01', '2026-12-31', null, 600, 'EUR', 'semiannual', null),
  ('b1000000-0000-4000-8000-000000000037', 'b1000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000021', 'suspended', 'failed', '2026-07-01', null, '2026-08-01', '2026-08-31', null, 999, 'USD', 'monthly', null);

insert into public.saas_subscription_events (
  tenant_id, subscription_id, previous_status, new_status,
  price, currency, billing_cycle, effective_on, occurred_at
) values
  ('b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000033', 'trial', 'active', 300, 'USD', 'quarterly', '2026-08-08', '2026-08-08 10:00:00+00'),
  ('b1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000035', null, 'active', 80, 'USD', 'monthly', '2026-07-01', '2026-07-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000031', 'active', 'active', 999, 'USD', 'monthly', '2026-09-01', '2026-09-01 00:00:00+00');

insert into public.saas_invoices (
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, due_on, issued_at, paid_at
) values
  ('b1000000-0000-4000-8000-000000000041', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000031', 'M-USD-PAID', 'paid', 500, 'USD', '2026-08-01', '2026-08-31', '2026-08-01', '2026-08-01 00:30:00+00', '2026-08-02 00:30:00+00'),
  ('b1000000-0000-4000-8000-000000000042', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000031', 'M-USD-PENDING', 'open', 70, 'USD', '2026-08-01', '2026-08-31', '2026-09-10', '2026-08-20 12:00:00+00', null),
  ('b1000000-0000-4000-8000-000000000043', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000032', 'M-USD-DUE-1', 'past_due', 40, 'USD', '2026-08-01', '2026-08-31', '2026-08-05', '2026-08-01 12:00:00+00', null),
  ('b1000000-0000-4000-8000-000000000044', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000033', 'M-USD-DUE-2', 'open', 30, 'USD', '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-01 12:00:00+00', null),
  ('b1000000-0000-4000-8000-000000000045', 'b1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000036', 'M-EUR-PAID', 'paid', 200, 'EUR', '2026-08-01', '2026-08-31', '2026-08-01', '2026-08-01 12:00:00+00', '2026-08-02 12:00:00+00'),
  ('b1000000-0000-4000-8000-000000000046', 'b1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000036', 'M-EUR-PENDING', 'open', 25, 'EUR', '2026-08-01', '2026-08-31', '2026-09-10', '2026-08-20 12:00:00+00', null);

insert into public.saas_charges (
  id, tenant_id, invoice_id, amount, currency, status, operation_id, occurred_at
) values
  ('b1000000-0000-4000-8000-000000000051', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000041', 500, 'USD', 'succeeded', 'b1000000-0000-4000-8000-000000000052', '2026-08-02 00:30:00+00'),
  ('b1000000-0000-4000-8000-000000000053', 'b1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000045', 200, 'EUR', 'succeeded', 'b1000000-0000-4000-8000-000000000054', '2026-08-02 12:00:00+00'),
  ('b1000000-0000-4000-8000-000000000055', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000041', 90, 'USD', 'succeeded', 'b1000000-0000-4000-8000-000000000056', '2026-07-31 23:59:59+00');
insert into public.saas_refunds (
  id, tenant_id, charge_id, amount, currency, status, reason, operation_id, processed_at
) values (
  'b1000000-0000-4000-8000-000000000061', 'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000051', 50, 'USD', 'succeeded', 'Credit',
  'b1000000-0000-4000-8000-000000000062', '2026-08-10 12:00:00+00'
);

-- An instructor payment with the same amount must never enter SaaS collections.
insert into public.students (id, tenant_id, full_name) values
  ('b1000000-0000-4000-8000-000000000071', 'b1000000-0000-4000-8000-000000000005', 'Instructor Customer');
insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency, billing_cycle
) values (
  'b1000000-0000-4000-8000-000000000072', 'b1000000-0000-4000-8000-000000000005',
  'Instructor Monthly', 500, 30, 'USD', 'monthly'
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
) values (
  'b1000000-0000-4000-8000-000000000073', 'b1000000-0000-4000-8000-000000000005',
  'b1000000-0000-4000-8000-000000000071', 'b1000000-0000-4000-8000-000000000072',
  '2026-08-01', '2026-08-30', 'active', 500, 'USD', 'monthly', '2026-08-31'
);
insert into public.student_membership_payments (
  tenant_id, membership_id, amount, currency, status, paid_at, operation_id
) values (
  'b1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000073',
  500, 'USD', 'paid', '2026-08-02 00:30:00+00', 'b1000000-0000-4000-8000-000000000074'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);
do $$
begin
  begin
    perform public.get_saas_financial_dashboard('2026-08-01');
    raise exception 'tenant owner accessed SaaS financial dashboard';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.platform_admin'), true);
do $$
declare
  first_result jsonb;
  second_result jsonb;
begin
  if not exists (
    select 1 from public.get_saas_financial_dashboard('2026-08-01') metric
    where metric.currency = 'USD'
      and metric.mrr = 380 and metric.arr = 4560 and metric.arpa = 95
      and metric.recurring_tenants = 4
      and metric.churned_tenants = 1 and metric.churn_rate = 33.33
      and metric.trials_ended = 2 and metric.trials_converted = 1
      and metric.trial_conversion_rate = 50
      and metric.collected_net = 450
      and metric.pending_amount = 70 and metric.past_due_amount = 70
      and metric.past_due_tenants = 2
  ) then
    raise exception 'USD SaaS financial metrics are incorrect';
  end if;
  if not exists (
    select 1 from public.get_saas_financial_dashboard('2026-08-01') metric
    where metric.currency = 'EUR'
      and metric.mrr = 100 and metric.arr = 1200 and metric.arpa = 100
      and metric.recurring_tenants = 1
      and metric.churned_tenants = 0 and metric.churn_rate = 0
      and metric.trials_ended = 0 and metric.trials_converted = 0
      and metric.trial_conversion_rate = 0
      and metric.collected_net = 200
      and metric.pending_amount = 25 and metric.past_due_amount = 0
      and metric.past_due_tenants = 0
  ) then
    raise exception 'EUR SaaS financial metrics are incorrect or currencies were mixed';
  end if;

  select jsonb_agg(to_jsonb(metric) order by metric.currency) into first_result
  from public.get_saas_financial_dashboard('2026-08-01') metric;
  select jsonb_agg(to_jsonb(metric) order by metric.currency) into second_result
  from public.get_saas_financial_dashboard('2026-08-01') metric;
  if first_result is distinct from second_result then
    raise exception 'SaaS financial dashboard is not reproducible';
  end if;

  begin
    perform public.get_saas_financial_dashboard('2026-08-02');
    raise exception 'non-monthly dashboard period was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

reset role;
do $$
begin
  if not exists (
    select 1 from pg_class table_definition
    join pg_namespace schema_definition
      on schema_definition.oid = table_definition.relnamespace
    where schema_definition.nspname = 'public'
      and table_definition.relname = 'saas_subscription_events'
      and table_definition.relrowsecurity
  ) then
    raise exception 'SaaS subscription events table is missing RLS';
  end if;
end;
$$;

rollback;