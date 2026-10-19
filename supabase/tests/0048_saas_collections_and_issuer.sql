-- Disposable Supabase/PostgreSQL only; all migrations through 0048 required.
-- No production fixtures. Every change is rolled back.
begin;
insert into auth.users(id, email) values
  ('ad480000-0000-4000-8000-000000000001', 'collections-admin@example.invalid'),
  ('ad480000-0000-4000-8000-000000000002', 'collections-other@example.invalid');
insert into public.platform_admins(id) values ('ad480000-0000-4000-8000-000000000001');
insert into public.tenants(id, name, status) values
  ('ad480000-0000-4000-8000-000000000011', 'Collections fixture 100%', 'active'),
  ('ad480000-0000-4000-8000-000000000012', 'Other collections fixture', 'active');

select set_config('request.jwt.claim.sub', 'ad480000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$
begin
  begin
    perform public.list_saas_collections(null, '', 'all', null, null, null, 1, 20);
    raise exception 'Non-admin listed collections';
  exception when insufficient_privilege then null; end;
  begin
    perform public.get_saas_collection('ad480000-0000-4000-8000-000000000021');
    raise exception 'Non-admin read collection detail';
  exception when insufficient_privilege then null; end;
  begin
    perform public.get_saas_billing_issuer();
    raise exception 'Non-admin read issuer';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_saas_billing_issuer(gen_random_uuid(), null,
      'Issuer', '12345678-5', 'Address', 'issuer@example.invalid', 'Not authorized');
    raise exception 'Non-admin saved issuer';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.saas_collection_balances;
    raise exception 'Direct view read allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', 'ad480000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
declare
  version_id uuid;
  quote jsonb;
  assigned jsonb;
  first_issuer jsonb;
  next_issuer jsonb;
  operation uuid := gen_random_uuid();
  current_issuer uuid;
begin
  current_issuer := (public.get_saas_billing_issuer()->'issuer'->>'id')::uuid;
  first_issuer := public.save_saas_billing_issuer(operation, current_issuer,
    'Issuer original', '12345678-5', 'First address', 'issuer@example.invalid', 'Initial issuer fixture');
  if public.save_saas_billing_issuer(operation, current_issuer,
    'Issuer original', '12345678-5', 'First address', 'issuer@example.invalid', 'Initial issuer fixture') <> first_issuer then
    raise exception 'Identical issuer retry changed result';
  end if;
  begin
    perform public.save_saas_billing_issuer(operation, current_issuer,
      'Different payload', '12345678-5', 'First address', 'issuer@example.invalid', 'Initial issuer fixture');
    raise exception 'Issuer operation payload mismatch was accepted';
  exception when unique_violation then null; end;
  begin
    perform public.save_saas_billing_issuer(gen_random_uuid(), current_issuer,
      'Stale issuer', '12345678-5', 'First address', 'issuer@example.invalid', 'Stale fixture');
    raise exception 'Stale issuer version was accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.save_saas_billing_issuer(gen_random_uuid(), (first_issuer->'issuer'->>'id')::uuid,
      'Bad RUT', '12345678-9', 'First address', 'issuer@example.invalid', 'Invalid RUT fixture');
    raise exception 'Invalid RUT checksum was accepted';
  exception when invalid_parameter_value then null; end;
  next_issuer := public.save_saas_billing_issuer(gen_random_uuid(), (first_issuer->'issuer'->>'id')::uuid,
    'Issuer updated', '10000013-K', 'Second address', 'updated@example.invalid', 'New immutable version');
  if next_issuer->'issuer'->>'id' = first_issuer->'issuer'->>'id' then
    raise exception 'Issuer was overwritten instead of versioned';
  end if;
  perform set_config('test.issuer_original', first_issuer->'issuer'->>'id', true);

  version_id := (public.publish_saas_plan_version(null, null, gen_random_uuid(),
    '{"name":"Collections plan","price":11900,"duration_unit":"months","duration_count":1,
      "trial_days":0,"max_students":100,"max_users":5,"features":[],"services":[]}',
    'Collections fixture plan')->>'version_id')::uuid;
  quote := public.preview_saas_subscription_assignment('ad480000-0000-4000-8000-000000000011',
    version_id, (now() at time zone 'America/Santiago')::date, false, null);
  assigned := public.confirm_saas_subscription_assignment('ad480000-0000-4000-8000-000000000011',
    version_id, (now() at time zone 'America/Santiago')::date, false, null,
    quote->>'fingerprint', gen_random_uuid(), 'Collections fixture assignment');
  perform set_config('test.collections_subscription', assigned->>'subscription_id', true);
end;
$$;
reset role;
do $$
begin
  if (select legal_name from public.saas_issuer_versions where id = current_setting('test.issuer_original')::uuid) <> 'Issuer original' then
    raise exception 'Previous issuer snapshot changed';
  end if;
  begin
    update public.saas_issuer_versions set legal_name = 'Overwrite' where id = current_setting('test.issuer_original')::uuid;
    raise exception 'Issuer mutation allowed';
  exception when object_not_in_prerequisite_state then null; end;
end;
$$;
update public.saas_invoices set status = 'void'
where subscription_id = current_setting('test.collections_subscription')::uuid;
insert into public.saas_invoices(
  id, tenant_id, subscription_id, invoice_number, status, amount, currency,
  period_starts_on, period_ends_on, period_end_exclusive, due_on, issued_at, paid_at
)
select f.id, 'ad480000-0000-4000-8000-000000000011',
  current_setting('test.collections_subscription')::uuid, f.number, f.status, f.amount, f.currency,
  (now() at time zone 'America/Santiago')::date,
  (now() at time zone 'America/Santiago')::date + 29,
  (now() at time zone 'America/Santiago')::date + 30,
  (now() at time zone 'America/Santiago')::date + f.due_delta, now(),
  case when f.status = 'paid' then now() end
from (values
  ('ad480000-0000-4000-8000-000000000021'::uuid, 'PARTIAL', 'open', 100, 'USD', -1),
  ('ad480000-0000-4000-8000-000000000022'::uuid, 'IMPORTED', 'paid', 11900, 'CLP', -1),
  ('ad480000-0000-4000-8000-000000000023'::uuid, 'VOID', 'void', 11900, 'CLP', -1),
  ('ad480000-0000-4000-8000-000000000024'::uuid, 'FUTURE', 'open', 11900, 'CLP', 1),
  ('ad480000-0000-4000-8000-000000000025'::uuid, 'DRAFT', 'draft', 11900, 'CLP', -1),
  ('ad480000-0000-4000-8000-000000000026'::uuid, 'SETTLED', 'open', 100, 'USD', -1)
) f(id, number, status, amount, currency, due_delta);
insert into public.saas_charges(id, tenant_id, invoice_id, amount, currency, status, operation_id)
values
  ('ad480000-0000-4000-8000-000000000031','ad480000-0000-4000-8000-000000000011',
    'ad480000-0000-4000-8000-000000000021',30.25,'USD','succeeded',gen_random_uuid()),
  ('ad480000-0000-4000-8000-000000000032','ad480000-0000-4000-8000-000000000011',
    'ad480000-0000-4000-8000-000000000021',19.75,'USD','succeeded',gen_random_uuid()),
  ('ad480000-0000-4000-8000-000000000033','ad480000-0000-4000-8000-000000000011',
    'ad480000-0000-4000-8000-000000000021',50,'USD','processing',gen_random_uuid()),
  ('ad480000-0000-4000-8000-000000000034','ad480000-0000-4000-8000-000000000011',
    'ad480000-0000-4000-8000-000000000026',100,'USD','succeeded',gen_random_uuid());
insert into public.saas_refunds(tenant_id, charge_id, amount, currency, status, reason, operation_id, processed_at)
values ('ad480000-0000-4000-8000-000000000011', 'ad480000-0000-4000-8000-000000000031',
  10, 'USD', 'succeeded', 'Historical refund fixture', gen_random_uuid(), now());
set local role authenticated;
do $$
declare
  result jsonb;
  detail jsonb;
  first_page jsonb;
  next_page jsonb;
begin
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'past_due', 'USD', null, null, 1, 20);
  if (result->>'total')::integer <> 1 or (result->'items'->0->>'balance')::numeric <> 50
    or (result->'items'->0->>'confirmed_amount')::numeric <> 50 then
    raise exception 'Partial balance duplicated by joins, converted, or reduced by in-flight attempts';
  end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'paid', 'USD', null, null, 1, 20);
  if (result->>'total')::integer <> 1 or (result->'items'->0->>'balance')::numeric <> 0
    or (result->'items'->0->>'confirmed_amount')::numeric <> 100 then
    raise exception 'Confirmed ledger settlement was not recognized';
  end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000012', '', 'all', null, null, null, 1, 20);
  if (result->>'total')::integer <> 0 then raise exception 'Tenant filter leaked other invoices'; end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'draft', null, null, null, 1, 20);
  if (result->>'total')::integer <> 1 or (result->'items'->0->>'balance')::numeric <> 0 then
    raise exception 'Draft was treated as collectible debt';
  end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'void', null, null, null, 1, 20);
  if (result->>'total')::integer <> 2 then raise exception 'Voided invoices disappeared from history'; end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '100%', 'paid', 'CLP', null, null, 1, 20);
  if (result->>'total')::integer <> 1 or (result->'items'->0->>'balance')::numeric <> 0
    or not (result->'items'->0->>'imported_settlement')::boolean then
    raise exception 'Imported settlement reopened or literal tenant search failed';
  end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '100_', 'all', null, null, null, 1, 20);
  if (result->>'total')::integer <> 0 then raise exception 'Search treated underscore as wildcard'; end if;
  result := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'open', 'CLP',
    (now() at time zone 'America/Santiago')::date + 1, (now() at time zone 'America/Santiago')::date + 1, 1, 20);
  if (result->>'total')::integer <> 1 then raise exception 'Inclusive due range filter failed'; end if;
  first_page := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'all', null, null, null, 1, 1);
  next_page := public.list_saas_collections('ad480000-0000-4000-8000-000000000011', '', 'all', null, null, null, 2, 1);
  if first_page->'items'->0->>'id' = next_page->'items'->0->>'id'
    or first_page->>'total' <> next_page->>'total' then raise exception 'Unstable pagination'; end if;
  detail := public.get_saas_collection('ad480000-0000-4000-8000-000000000021');
  if (detail->>'charge_count')::integer <> 3 or (detail->>'refund_count')::integer <> 1
    or (detail->'invoice'->>'balance')::numeric <> 50
    or (detail->'invoice'->>'in_flight_count')::integer <> 1 then raise exception 'Detail ledger does not reconcile'; end if;
  begin
    perform public.list_saas_collections(null, '', 'all', null, current_date, current_date - 1, 1, 20);
    raise exception 'Reversed due dates accepted';
  exception when invalid_parameter_value then null; end;
end;
$$;
reset role;
do $$
begin
  if not exists (select 1 from public.saas_privileged_audit_log
    where actor_user_id = 'ad480000-0000-4000-8000-000000000001'
      and action = 'saas.collection_read' and metadata->>'invoice_id' = 'ad480000-0000-4000-8000-000000000021') then
    raise exception 'Detail read not audited';
  end if;
end;
$$;
rollback;
