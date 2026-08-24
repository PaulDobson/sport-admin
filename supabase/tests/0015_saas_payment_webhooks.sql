-- Run after migrations 0001-0016.
begin;

insert into public.tenants (id, name, status) values
  ('f0000000-0000-4000-8000-000000000001', 'Webhook Tenant A', 'active'),
  ('f0000000-0000-4000-8000-000000000002', 'Webhook Tenant B', 'active');
insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle, max_students, max_users
) values (
  'f0000000-0000-4000-8000-000000000011', 'webhook-plan', 'Webhook Plan',
  49, 'USD', 'monthly', 100, 5
);
insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on,
  current_period_starts_on, current_period_ends_on, price, currency,
  billing_cycle, payment_provider, external_subscription_id
) values
  ('f0000000-0000-4000-8000-000000000021', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000011', 'active', 'pending', '2026-08-01', '2026-08-01', '2026-08-31', 49, 'USD', 'monthly', 'generic', 'subscription-a'),
  ('f0000000-0000-4000-8000-000000000022', 'f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000011', 'active', 'pending', '2026-08-01', '2026-08-01', '2026-08-31', 49, 'USD', 'monthly', 'generic', 'subscription-b');
insert into public.saas_invoices (
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, payment_provider, external_invoice_id
) values
  ('f0000000-0000-4000-8000-000000000031', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000021', 'WEBHOOK-A-1', 'open', 49, 'USD', '2026-08-01', '2026-08-31', 'generic', 'invoice-a-success'),
  ('f0000000-0000-4000-8000-000000000032', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000021', 'WEBHOOK-A-2', 'open', 49, 'USD', '2026-09-01', '2026-09-30', 'generic', 'invoice-a-failed'),
  ('f0000000-0000-4000-8000-000000000033', 'f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000022', 'WEBHOOK-B-1', 'open', 49, 'USD', '2026-08-01', '2026-08-31', 'generic', 'invoice-b');

set local role service_role;

do $$
declare
  first_event_id uuid;
  repeated_event_id uuid;
begin
  first_event_id := public.process_saas_payment_event(
    'generic', 'event-charge-success', 'charge.succeeded', 'subscription-a',
    'invoice-a-success', 'charge-a-success', null, 49, 'USD',
    '2026-08-02 10:00:00+00', null
  );
  repeated_event_id := public.process_saas_payment_event(
    'generic', 'event-charge-success', 'charge.succeeded', 'subscription-a',
    'invoice-a-success', 'charge-a-success', null, 49, 'USD',
    '2026-08-02 10:00:00+00', null
  );
  if first_event_id <> repeated_event_id then
    raise exception 'repeated provider event returned a different id';
  end if;
  if (select count(*) from public.saas_provider_events where external_event_id = 'event-charge-success') <> 1
    or (select count(*) from public.saas_charges where external_charge_id = 'charge-a-success') <> 1 then
    raise exception 'repeated provider event created duplicate ledger rows';
  end if;
  if (select status from public.saas_invoices where id = 'f0000000-0000-4000-8000-000000000031') <> 'paid'
    or (select payment_status from public.saas_subscriptions where id = 'f0000000-0000-4000-8000-000000000021') <> 'paid' then
    raise exception 'successful charge did not update SaaS billing state';
  end if;

  perform public.process_saas_payment_event(
    'generic', 'event-refund-success', 'refund.succeeded', 'subscription-a',
    null, 'charge-a-success', 'refund-a-success', 49, 'USD',
    '2026-08-03 10:00:00+00', 'Customer request'
  );
  if (select status from public.saas_invoices where id = 'f0000000-0000-4000-8000-000000000031') <> 'refunded'
    or (select status from public.saas_charges where external_charge_id = 'charge-a-success') <> 'refunded' then
    raise exception 'full refund did not update SaaS billing state';
  end if;

  perform public.process_saas_payment_event(
    'generic', 'event-charge-failed', 'charge.failed', 'subscription-a',
    'invoice-a-failed', 'charge-a-failed', null, 49, 'USD',
    '2026-09-02 10:00:00+00', 'Card declined'
  );
  if (select status from public.saas_invoices where id = 'f0000000-0000-4000-8000-000000000032') <> 'past_due'
    or (select payment_status from public.saas_subscriptions where id = 'f0000000-0000-4000-8000-000000000021') <> 'failed'
    or (select status from public.saas_subscriptions where id = 'f0000000-0000-4000-8000-000000000021') <> 'past_due' then
    raise exception 'failed charge did not update SaaS billing state';
  end if;

  begin
    perform public.process_saas_payment_event(
      'generic', 'event-cross-tenant', 'charge.succeeded', 'subscription-a',
      'invoice-b', 'charge-cross-tenant', null, 49, 'USD',
      '2026-08-04 10:00:00+00', null
    );
    raise exception 'cross-tenant invoice was accepted';
  exception when no_data_found then null;
  end;

  if exists (
    select 1 from public.student_membership_payments
    where operation_id in (
      select event.id from public.saas_provider_events event
      where event.provider = 'generic'
    )
  ) then
    raise exception 'SaaS provider event leaked into instructor ledger';
  end if;
  if (select count(*) from public.audit_log where entity_type = 'saas_provider_event') <> 3 then
    raise exception 'provider events were not audited exactly once';
  end if;
end;
$$;

reset role;
rollback;