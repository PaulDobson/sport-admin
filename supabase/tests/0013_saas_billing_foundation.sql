-- Run after migrations 0001-0014. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values
  ('d0000000-0000-4000-8000-000000000001', 'SaaS Tenant A', 'active'),
  ('d0000000-0000-4000-8000-000000000002', 'SaaS Tenant B', 'active'),
  ('d0000000-0000-4000-8000-000000000003', 'SaaS Tenant Suspended', 'suspended');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('d0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active'),
  ('d0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000003', current_setting('test.user_a')::uuid, 'owner', 'active');
insert into public.platform_admins (id)
values (current_setting('test.user_b')::uuid)
on conflict (id) do nothing;

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle, trial_days,
  max_students, max_users, features
) values (
  'd0000000-0000-4000-8000-000000000021', 'growth', 'Growth',
  49, 'USD', 'monthly', 14, 100, 5, '["reports", "offline"]'::jsonb
);
insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on, trial_ends_on,
  current_period_starts_on, current_period_ends_on, next_billing_date,
  price, currency, billing_cycle
) values
  ('d0000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000021', 'active', 'paid', '2026-08-01', null, '2026-08-01', '2026-08-31', '2026-09-01', 49, 'USD', 'monthly'),
  ('d0000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000021', 'trial', 'not_due', '2026-08-15', '2026-08-28', '2026-08-15', '2026-08-28', '2026-08-29', 49, 'USD', 'monthly'),
  ('d0000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000021', 'suspended', 'failed', '2026-07-01', null, '2026-08-01', '2026-08-31', '2026-09-01', 49, 'USD', 'monthly');
insert into public.saas_limits (
  tenant_id, subscription_id, max_students, max_users, features, effective_from
) values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000031', 100, 5, '["reports", "offline"]'::jsonb, '2026-08-01'),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000032', 100, 5, '["reports", "offline"]'::jsonb, '2026-08-15'),
  ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000033', 100, 5, '["reports", "offline"]'::jsonb, '2026-07-01');
insert into public.saas_invoices (
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, due_on, issued_at, paid_at
) values
  ('d0000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000031', 'SAAS-A-001', 'paid', 49, 'USD', '2026-08-01', '2026-08-31', '2026-08-01', '2026-08-01 10:00:00+00', '2026-08-01 10:05:00+00'),
  ('d0000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000032', 'SAAS-B-001', 'draft', 49, 'USD', '2026-08-15', '2026-08-28', null, null, null);
insert into public.saas_charges (
  id, tenant_id, invoice_id, amount, currency, status, operation_id,
  provider, external_charge_id
) values
  ('d0000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000041', 49, 'USD', 'succeeded', 'd0000000-0000-4000-8000-000000000052', 'fixture', 'charge-a'),
  ('d0000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000042', 49, 'USD', 'failed', 'd0000000-0000-4000-8000-000000000054', 'fixture', 'charge-b');
insert into public.saas_refunds (
  id, tenant_id, charge_id, amount, currency, status, reason, operation_id,
  external_refund_id, processed_at
) values (
  'd0000000-0000-4000-8000-000000000061', 'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000051', 10, 'USD', 'succeeded',
  'Service credit', 'd0000000-0000-4000-8000-000000000062', 'refund-a',
  '2026-08-02 10:00:00+00'
);
insert into public.tenant_status_history (
  tenant_id, previous_status, new_status, reason, actor_user_id
) values
  ('d0000000-0000-4000-8000-000000000001', 'trial', 'active', 'Trial converted', current_setting('test.user_b')::uuid),
  ('d0000000-0000-4000-8000-000000000003', 'active', 'suspended', 'SaaS payment failed', current_setting('test.user_b')::uuid);

-- Instructor finance fixture with the same tenant and amount remains in its own ledger.
insert into public.students (id, tenant_id, full_name) values
  ('d0000000-0000-4000-8000-000000000071', 'd0000000-0000-4000-8000-000000000001', 'Instructor Customer');
insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency, billing_cycle
) values (
  'd0000000-0000-4000-8000-000000000072', 'd0000000-0000-4000-8000-000000000001',
  'Student Monthly', 49, 30, 'USD', 'monthly'
);
insert into public.student_memberships (
  id, tenant_id, student_id, plan_id, starts_at, expires_at, status,
  agreed_price, currency, billing_cycle, next_billing_date
) values (
  'd0000000-0000-4000-8000-000000000073', 'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000071', 'd0000000-0000-4000-8000-000000000072',
  '2026-08-01', '2026-08-30', 'active', 49, 'USD', 'monthly', '2026-08-31'
);
insert into public.student_membership_payments (
  id, tenant_id, membership_id, amount, currency, status, paid_at, operation_id
) values (
  'd0000000-0000-4000-8000-000000000074', 'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000073', 49, 'USD', 'paid',
  '2026-08-01 11:00:00+00', 'd0000000-0000-4000-8000-000000000075'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.saas_plans) <> 1 then
    raise exception 'tenant owner cannot read active SaaS plans';
  end if;
  if (select count(*) from public.saas_subscriptions) <> 2 then
    raise exception 'owner must see own active and suspended tenant subscriptions only';
  end if;
  if not public.can_read_saas_billing('d0000000-0000-4000-8000-000000000003') then
    raise exception 'suspended tenant owner must retain SaaS billing visibility';
  end if;
  if (select count(*) from public.saas_invoices) <> 1
    or (select count(*) from public.saas_charges) <> 1
    or (select count(*) from public.saas_refunds) <> 1 then
    raise exception 'tenant owner SaaS ledger visibility is incorrect';
  end if;
  if (select count(*) from public.student_membership_payments) <> 1 then
    raise exception 'instructor ledger fixture is missing';
  end if;
  if exists (
    select 1 from public.saas_charges
    where id = 'd0000000-0000-4000-8000-000000000074'
  ) or exists (
    select 1 from public.student_membership_payments
    where id = 'd0000000-0000-4000-8000-000000000051'
  ) then
    raise exception 'SaaS and instructor ledgers were mixed';
  end if;

  update public.saas_invoices set amount = 1
  where tenant_id = 'd0000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'tenant owner updated a SaaS invoice'; end if;

  begin
    insert into public.saas_charges (
      tenant_id, invoice_id, amount, currency, operation_id
    ) values (
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000041', 1, 'USD',
      'd0000000-0000-4000-8000-000000000076'
    );
    raise exception 'tenant owner inserted a SaaS charge';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator was not recognized';
  end if;
  if (select count(*) from public.saas_subscriptions) <> 3
    or (select count(*) from public.saas_limits) <> 3
    or (select count(*) from public.saas_invoices) <> 2
    or (select count(*) from public.saas_charges) <> 2
    or (select count(*) from public.tenant_status_history) <> 2 then
    raise exception 'platform administrator cannot inspect the full SaaS ledger';
  end if;

  begin
    insert into public.saas_subscriptions (
      tenant_id, plan_id, status, starts_on, current_period_starts_on,
      current_period_ends_on, price, currency, billing_cycle
    ) values (
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000021', 'active', '2026-09-01',
      '2026-09-01', '2026-09-30', 49, 'USD', 'monthly'
    );
    raise exception 'duplicate current subscription was accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.saas_invoices (
      tenant_id, subscription_id, invoice_number, amount, currency,
      period_starts_on, period_ends_on
    ) values (
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000032', 'CROSS-TENANT', 49, 'USD',
      '2026-09-01', '2026-09-30'
    );
    raise exception 'cross-tenant SaaS invoice relation was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.saas_charges (
      tenant_id, invoice_id, amount, currency, operation_id
    ) values (
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000041', 49, 'USD',
      'd0000000-0000-4000-8000-000000000052'
    );
    raise exception 'duplicate SaaS operation was accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.saas_refunds (
      tenant_id, charge_id, amount, currency, status, reason, operation_id
    ) values (
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000051', 1, 'usd', 'pending',
      'Invalid currency', 'd0000000-0000-4000-8000-000000000077'
    );
    raise exception 'invalid SaaS currency was accepted';
  exception when check_violation then null;
  end;
end;
$$;

reset role;

do $$
declare
  expected_table text;
begin
  foreach expected_table in array array[
    'saas_plans', 'saas_subscriptions', 'saas_limits', 'saas_invoices',
    'saas_charges', 'saas_refunds', 'tenant_status_history'
  ] loop
    if not exists (
      select 1 from pg_class table_definition
      join pg_namespace schema_definition
        on schema_definition.oid = table_definition.relnamespace
      where schema_definition.nspname = 'public'
        and table_definition.relname = expected_table
        and table_definition.relrowsecurity
    ) then
      raise exception 'SaaS billing table missing RLS: %', expected_table;
    end if;
  end loop;
end;
$$;

rollback;