-- Disposable PostgreSQL/Supabase only, migrations through 0046. Not yet executed.
begin;
set local timezone = 'Pacific/Auckland';
insert into auth.users(id, email) values
  ('ad460000-0000-4000-8000-000000000001', 'change-admin@example.invalid'),
  ('ad460000-0000-4000-8000-000000000002', 'change-owner@example.invalid');
insert into public.platform_admins(id) values ('ad460000-0000-4000-8000-000000000001');
insert into public.tenants(id, name, status) values
  ('ad460000-0000-4000-8000-000000000011', 'Plan change fixture', 'active');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ad460000-0000-4000-8000-000000000001', true);
do $$
declare
  terms jsonb := '{"name":"Base","description":null,"price":30000,"duration_unit":"days","duration_count":30,
    "trial_days":0,"max_students":100,"max_users":5,"features":["reports"],"services":["Soporte"]}';
  base_version uuid;
  pro_version uuid;
  max_version uuid;
  quote jsonb;
  saved jsonb;
  today date := (now() at time zone 'America/Santiago')::date;
begin
  base_version := (public.publish_saas_plan_version(null, null, gen_random_uuid(), terms, 'Base de prueba')->>'version_id')::uuid;
  pro_version := (public.publish_saas_plan_version(null, null, gen_random_uuid(), terms || '{"name":"Pro","price":60000}', 'Pro de prueba')->>'version_id')::uuid;
  max_version := (public.publish_saas_plan_version(null, null, gen_random_uuid(), terms || '{"name":"Max","price":90000}', 'Max de prueba')->>'version_id')::uuid;
  perform set_config('test.change_base', base_version::text, true);
  perform set_config('test.change_pro', pro_version::text, true);
  perform set_config('test.change_max', max_version::text, true);
  quote := public.preview_saas_subscription_assignment('ad460000-0000-4000-8000-000000000011', base_version, today, false, null);
  saved := public.confirm_saas_subscription_assignment(
    'ad460000-0000-4000-8000-000000000011', base_version, today, false, null,
    quote->>'fingerprint', gen_random_uuid(), 'Contrato de prueba');
  perform set_config('test.change_subscription', saved->>'subscription_id', true);
end;
$$;
reset role;
-- Move the synthetic contract to day 20/30, without changing its applied tariff.
update public.saas_subscriptions set
  starts_on = (now() at time zone 'America/Santiago')::date - 20,
  current_period_starts_on = (now() at time zone 'America/Santiago')::date - 20,
  current_period_ends_on = (now() at time zone 'America/Santiago')::date + 9,
  current_period_end_exclusive = (now() at time zone 'America/Santiago')::date + 10,
  next_billing_date = (now() at time zone 'America/Santiago')::date + 10,
  period_anchor_on = (now() at time zone 'America/Santiago')::date - 20
where id = current_setting('test.change_subscription')::uuid;
update public.saas_limits set effective_from = (now() at time zone 'America/Santiago')::date - 20
where subscription_id = current_setting('test.change_subscription')::uuid;
set local role authenticated;
do $$
declare
  tenant uuid := 'ad460000-0000-4000-8000-000000000011';
  pro uuid := current_setting('test.change_pro')::uuid;
  max_version uuid := current_setting('test.change_max')::uuid;
  base uuid := current_setting('test.change_base')::uuid;
  quote jsonb;
  saved jsonb;
  saved_again jsonb;
  downgrade jsonb;
  cancelled jsonb;
  today date := (now() at time zone 'America/Santiago')::date;
begin
  quote := public.preview_saas_plan_change(tenant, pro);
  if quote->>'kind' <> 'upgrade' or (quote->>'amount_due')::numeric <> 10000
    or (quote->>'remaining_days')::integer <> 10 or (quote->>'effective_on')::date <> today
    or (quote->>'net')::numeric <> 8403 or (quote->>'vat')::numeric <> 1597 then
    raise exception '30k to 60k with 10/30 days left must charge 10000 CLP';
  end if;
  saved := public.confirm_saas_plan_change(tenant, pro, quote->>'fingerprint',
    'ad460000-0000-4000-8000-000000000021', 'Primer upgrade');
  saved_again := public.confirm_saas_plan_change(tenant, pro, quote->>'fingerprint',
    'ad460000-0000-4000-8000-000000000021', 'Primer upgrade');
  if saved <> saved_again or saved->>'invoice_id' is null then
    raise exception 'Upgrade retry duplicated or omitted its invoice';
  end if;
  begin
    perform public.confirm_saas_plan_change(tenant, pro, quote->>'fingerprint',
      'ad460000-0000-4000-8000-000000000021', 'Otro motivo');
    raise exception 'Operation id reused with another payload';
  exception when unique_violation then null;
  end;
  begin
    perform public.confirm_saas_plan_change(tenant, max_version, quote->>'fingerprint', gen_random_uuid(), 'Preview obsoleto');
    raise exception 'A stale fingerprint confirmed another version';
  exception when serialization_failure then null;
  end;
  quote := public.preview_saas_plan_change(tenant, max_version);
  if (quote->>'amount_due')::numeric <> 10000
    or (quote->>'period_end_exclusive')::date <> today + 10 then
    raise exception 'Successive upgrade double charged or moved the renewal';
  end if;
  perform public.confirm_saas_plan_change(tenant, max_version, quote->>'fingerprint', gen_random_uuid(), 'Segundo upgrade');
  quote := public.preview_saas_plan_change(tenant, base);
  if quote->>'kind' <> 'downgrade' or (quote->>'amount_due')::numeric <> 0
    or (quote->>'effective_on')::date <> today + 10 then
    raise exception 'Downgrade must schedule at renewal without a refund';
  end if;
  downgrade := public.confirm_saas_plan_change(tenant, base, quote->>'fingerprint',
    'ad460000-0000-4000-8000-000000000022', 'Downgrade solicitado');
  if downgrade->>'scheduled_change_id' is null or downgrade->>'invoice_id' is not null then
    raise exception 'Downgrade omitted schedule or invented invoice';
  end if;
  if public.get_saas_subscription_management(tenant)->'scheduled_change'->>'id'
    is distinct from downgrade->>'scheduled_change_id' then
    raise exception 'Management read omitted the scheduled change';
  end if;
  begin
    perform public.preview_saas_plan_change(tenant, pro);
    raise exception 'Another change bypassed the pending downgrade';
  exception when invalid_parameter_value then null;
  end;
  cancelled := public.cancel_saas_scheduled_change(tenant, (downgrade->>'scheduled_change_id')::uuid,
    'ad460000-0000-4000-8000-000000000023', 'Mantener plan Max');
  if cancelled <> public.cancel_saas_scheduled_change(tenant, (downgrade->>'scheduled_change_id')::uuid,
    'ad460000-0000-4000-8000-000000000023', 'Mantener plan Max') then
    raise exception 'Cancellation retry is not idempotent';
  end if;
  begin
    perform public.schedule_saas_plan_limits(
      tenant, current_setting('test.change_subscription')::uuid,
      (select (public.get_saas_subscription_management(tenant)->'subscription'->>'plan_id')::uuid),
      today + 11, 'Bypass de limites');
    raise exception 'Legacy limits RPC bypassed the commercial change';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
select set_config('request.jwt.claim.sub', 'ad460000-0000-4000-8000-000000000002', true);
do $$
begin
  begin
    perform public.preview_saas_plan_change('ad460000-0000-4000-8000-000000000011', current_setting('test.change_pro')::uuid);
    raise exception 'Non-admin previewed a commercial change';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
do $$
declare
  s public.saas_subscriptions;
begin
  select * into s from public.saas_subscriptions where id = current_setting('test.change_subscription')::uuid;
  if s.price <> 90000 or s.current_period_end_exclusive <> (now() at time zone 'America/Santiago')::date + 10
    or s.current_period_end_exclusive <> s.next_billing_date then
    raise exception 'Contract did not preserve price and renewal boundary';
  end if;
  if (select count(*) from public.saas_invoices where subscription_id = s.id and invoice_kind = 'upgrade') <> 2
    or (select sum(amount) from public.saas_invoices where subscription_id = s.id and invoice_kind = 'upgrade') <> 20000 then
    raise exception 'Upgrade invoice count or sum is wrong';
  end if;
  if (select count(*) from public.saas_limits where subscription_id = s.id) <> 2
    or (select count(*) from public.saas_limits where subscription_id = s.id and effective_until is null) <> 1 then
    raise exception 'Prior-day limit history was lost or intraday snapshots duplicated';
  end if;
  if exists (select 1 from public.saas_charges c join public.saas_invoices i on i.id = c.invoice_id
    where i.subscription_id = s.id)
    or exists (select 1 from public.saas_payment_receipts where tenant_id = s.tenant_id) then
    raise exception 'Plan change invented a payment or receipt';
  end if;
  if (select plan_version_id from public.saas_subscription_events where subscription_id = s.id
    order by effective_on desc, occurred_at desc, event_order desc limit 1) <> current_setting('test.change_max')::uuid then
    raise exception 'Same-day contract events are not deterministically ordered';
  end if;
end;
$$;
rollback;
