-- Disposable PostgreSQL/Supabase only, migrations through 0045. Not yet executed.
begin;
set local timezone = 'America/Santiago';
insert into auth.users(id, email) values
  ('ad450000-0000-4000-8000-000000000001', 'flexible-finance@example.invalid');
insert into public.platform_admins(id) values ('ad450000-0000-4000-8000-000000000001');
insert into public.tenants(id, name, status) values
  ('ad450000-0000-4000-8000-000000000011', 'Flexible finance fixture', 'active');
select set_config('request.jwt.claim.sub', 'ad450000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
declare
  version_id uuid;
  quote jsonb;
  saved jsonb;
  before_metrics jsonb;
  period date := date_trunc('month', (now() at time zone 'America/Santiago')::date)::date;
begin
  select to_jsonb(d) into before_metrics from public.get_saas_financial_dashboard(period) d where d.currency = 'CLP';
  perform set_config('test.flexible_before', coalesce(before_metrics, '{}')::text, true);
  version_id := (public.publish_saas_plan_version(null, null, gen_random_uuid(),
    '{"name":"30-day contract","price":30000,"duration_unit":"days","duration_count":30,
      "trial_days":0,"max_students":100,"max_users":5,"features":[],"services":[]}',
    'Plan para regresion financiera')->>'version_id')::uuid;
  quote := public.preview_saas_subscription_assignment(
    'ad450000-0000-4000-8000-000000000011', version_id, (now() at time zone 'America/Santiago')::date, false, null);
  saved := public.confirm_saas_subscription_assignment(
    'ad450000-0000-4000-8000-000000000011', version_id, (now() at time zone 'America/Santiago')::date,
    false, null, quote->>'fingerprint', gen_random_uuid(), 'Contrato para regresion');
  perform set_config('test.flexible_subscription', saved->>'subscription_id', true);
end;
$$;
reset role;
update public.saas_invoices set status = 'void'
  where subscription_id = current_setting('test.flexible_subscription')::uuid;
insert into public.saas_invoices(
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at, paid_at
)
select fixture.id, 'ad450000-0000-4000-8000-000000000011',
  current_setting('test.flexible_subscription')::uuid, fixture.number, fixture.status, fixture.amount, 'CLP',
  date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  (date_trunc('month', now()) + interval '1 month')::date,
  date_trunc('month', now())::date, date_trunc('month', now()),
  case when fixture.status = 'paid' then date_trunc('month', now()) end
from (values
  ('ad450000-0000-4000-8000-000000000021'::uuid, 'PARTIAL-HISTORY', 'open', 100),
  ('ad450000-0000-4000-8000-000000000022'::uuid, 'PAID-IMPORT', 'paid', 200)
) fixture(id, number, status, amount);
insert into public.saas_charges(tenant_id, invoice_id, amount, currency, status, operation_id, occurred_at)
values
  ('ad450000-0000-4000-8000-000000000011','ad450000-0000-4000-8000-000000000021',30,'CLP','succeeded',
    'ad450000-0000-4000-8000-000000000031',date_trunc('month', now())),
  ('ad450000-0000-4000-8000-000000000011','ad450000-0000-4000-8000-000000000021',20,'CLP','succeeded',
    'ad450000-0000-4000-8000-000000000032',date_trunc('month', now()));
set local role authenticated;
do $$
declare
  before_metrics jsonb := current_setting('test.flexible_before')::jsonb;
  after_metrics jsonb;
  period date := date_trunc('month', (now() at time zone 'America/Santiago')::date)::date;
begin
  select to_jsonb(d) into after_metrics from public.get_saas_financial_dashboard(period) d where d.currency = 'CLP';
  if (after_metrics->>'mrr')::numeric - coalesce((before_metrics->>'mrr')::numeric, 0) <> 30416.67 then
    raise exception 'Daily duration MRR is not normalized as price * 365 / (12 * days)';
  end if;
  if (after_metrics->>'past_due_amount')::numeric - coalesce((before_metrics->>'past_due_amount')::numeric, 0) <> 50 then
    raise exception 'Invoice balance multiplied by charges or imported paid invoice reopened';
  end if;
  if (after_metrics->>'collected_net')::numeric - coalesce((before_metrics->>'collected_net')::numeric, 0) <> 50 then
    raise exception 'Confirmed collections do not match the ledger';
  end if;
end;
$$;
rollback;
