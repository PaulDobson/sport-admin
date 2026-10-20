begin;

create index saas_charges_invoice_history_idx
  on public.saas_charges(tenant_id, invoice_id, occurred_at desc, id);
create index saas_refunds_charge_history_idx
  on public.saas_refunds(tenant_id, charge_id, requested_at desc, id);

-- Refunds preserve the original payment; they do not reopen collectible debt.
create view public.saas_collection_balances as
select i.id, i.tenant_id, t.name as tenant_name, i.subscription_id,
  i.invoice_number, i.status as stored_status, i.invoice_kind, i.amount, i.currency,
  i.period_starts_on, i.period_end_exclusive, i.due_on, i.issued_at, i.paid_at,
  i.contract_snapshot->>'name' as plan_name,
  coalesce(c.total, 0) as confirmed_amount,
  coalesce(c.in_flight, 0) as in_flight_count,
  (i.invoice_kind = 'legacy' and i.status = 'paid' and coalesce(c.confirmed_count, 0) = 0) as imported_settlement,
  case when i.status in ('draft', 'void', 'refunded') then 0
    when i.invoice_kind = 'legacy' and i.status = 'paid' and coalesce(c.confirmed_count, 0) = 0 then 0
    else greatest(0, i.amount - coalesce(c.total, 0)) end::numeric as balance,
  case when i.status in ('draft', 'void', 'refunded') then i.status
    when coalesce(c.total, 0) >= i.amount
      or (i.invoice_kind = 'legacy' and i.status = 'paid' and coalesce(c.confirmed_count, 0) = 0) then 'paid'
    when i.due_on <= (now() at time zone 'America/Santiago')::date then 'past_due'
    else 'open' end as status
from public.saas_invoices i
join public.tenants t on t.id = i.tenant_id
left join lateral (
  select sum(ch.amount) filter (where ch.status in ('succeeded', 'refunded')) as total,
    count(*) filter (where ch.status in ('succeeded', 'refunded')) as confirmed_count,
    count(*) filter (where ch.status in ('pending', 'processing')) as in_flight
  from public.saas_charges ch
  where ch.tenant_id = i.tenant_id and ch.invoice_id = i.id and ch.currency = i.currency
) c on true;
revoke all on public.saas_collection_balances from public, anon, authenticated;

create function public.list_saas_collections(
  target_tenant uuid, tenant_query text, target_status text, target_currency text,
  due_from date, due_until date, page_number integer, page_size integer
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if page_number is null or page_number not between 1 and 1000000
    or page_size is null or page_size not between 1 and 100
    or target_status is null or target_status not in ('all','open','past_due','paid','draft','void','refunded')
    or (tenant_query is not null and length(tenant_query) > 160)
    or (target_currency is not null and target_currency !~ '^[A-Z]{3}$')
    or (due_from is not null and due_until is not null and due_from > due_until) then
    raise exception 'Invalid collection filters' using errcode = '22023';
  end if;
  with filtered as materialized (
    select b.* from public.saas_collection_balances b
    where (target_tenant is null or b.tenant_id = target_tenant)
      and (nullif(btrim(tenant_query), '') is null
        or strpos(lower(b.tenant_name), lower(btrim(tenant_query))) > 0)
      and (target_status = 'all' or b.status = target_status)
      and (target_currency is null or b.currency = target_currency)
      and (due_from is null or b.due_on >= due_from)
      and (due_until is null or b.due_on <= due_until)
  ), paged as (
    select * from filtered
    order by due_on asc nulls last, issued_at desc nulls last, id
    limit page_size offset (page_number - 1) * page_size
  )
  select jsonb_build_object(
    'business_date', (now() at time zone 'America/Santiago')::date,
    'total', (select count(*) from filtered), 'page', page_number, 'page_size', page_size,
    'items', coalesce((select jsonb_agg(to_jsonb(p)
      order by p.due_on asc nulls last, p.issued_at desc nulls last, p.id) from paged p), '[]'::jsonb)
  ) into result;
  perform public.record_saas_privileged_operation(target_tenant, 'saas.collections_read',
    'Consultar cartera SaaS', 'succeeded', jsonb_build_object(
      'status', target_status, 'currency', target_currency, 'due_from', due_from,
      'due_until', due_until, 'page', page_number, 'page_size', page_size));
  return result;
end;
$$;

create function public.get_saas_collection(target_invoice uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  -- One statement keeps balance, events and counts in the same MVCC snapshot.
  select jsonb_build_object(
    'business_date', (now() at time zone 'America/Santiago')::date, 'invoice', to_jsonb(b),
    'charges', (select coalesce(jsonb_agg(to_jsonb(c) order by c.occurred_at desc, c.id), '[]'::jsonb)
      from (select id, amount, currency, status, occurred_at, provider, manual_method, manual_reference
        from public.saas_charges where invoice_id = b.id and tenant_id = b.tenant_id
        order by occurred_at desc, id limit 100) c),
    'refunds', (select coalesce(jsonb_agg(to_jsonb(r) order by r.requested_at desc, r.id), '[]'::jsonb)
      from (select r.id, r.charge_id, r.amount, r.currency, r.status, r.requested_at, r.processed_at, r.reason
        from public.saas_refunds r join public.saas_charges c on c.id = r.charge_id and c.tenant_id = r.tenant_id
        where c.invoice_id = b.id and c.tenant_id = b.tenant_id order by r.requested_at desc, r.id limit 100) r),
    'charge_count', (select count(*) from public.saas_charges where invoice_id = b.id and tenant_id = b.tenant_id),
    'refund_count', (select count(*) from public.saas_refunds r join public.saas_charges c
      on c.id = r.charge_id and c.tenant_id = r.tenant_id
      where c.invoice_id = b.id and c.tenant_id = b.tenant_id))
  into result from public.saas_collection_balances b where b.id = target_invoice;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  perform public.record_saas_privileged_operation((result->'invoice'->>'tenant_id')::uuid, 'saas.collection_read',
    'Consultar detalle de cobro SaaS', 'succeeded', jsonb_build_object('invoice_id', target_invoice));
  return result;
end;
$$;

create function public.is_valid_saas_issuer_tax_id(value text)
returns boolean language plpgsql immutable set search_path = public
as $$
declare
  digits text;
  checksum integer := 0;
  weight integer := 2;
  remainder integer;
  expected text;
  digit_index integer;
begin
  if value is null or value !~ '^[0-9]{7,8}-[0-9K]$' then return false; end if;
  digits := split_part(value, '-', 1);
  if digits::bigint = 0 then return false; end if;
  for digit_index in reverse length(digits)..1 loop
    checksum := checksum + substr(digits, digit_index, 1)::integer * weight;
    weight := case when weight = 7 then 2 else weight + 1 end;
  end loop;
  remainder := 11 - checksum % 11;
  expected := case remainder when 11 then '0' when 10 then 'K' else remainder::text end;
  return split_part(value, '-', 2) = expected;
end;
$$;
revoke all on function public.is_valid_saas_issuer_tax_id(text) from public, anon, authenticated;

create function public.get_saas_billing_issuer()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  issuer jsonb;
begin
  perform public.record_saas_privileged_operation(null, 'saas.issuer_read',
    'Consultar emisor de comprobantes', 'succeeded');
  select to_jsonb(v) - 'created_by' into issuer
  from public.saas_billing_settings s join public.saas_issuer_versions v on v.id = s.issuer_version_id
  where s.singleton;
  return jsonb_build_object('issuer', issuer);
end;
$$;

create function public.save_saas_billing_issuer(
  operation_id uuid, expected_version uuid, legal_name text, tax_id text,
  address text, email text, change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous public.saas_billing_operations;
  request_payload jsonb;
  current_version uuid;
  created public.saas_issuer_versions;
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or change_reason is null or length(btrim(change_reason)) not between 3 and 500
    or legal_name is null or length(btrim(legal_name)) not between 1 and 160
    or not public.is_valid_saas_issuer_tax_id(tax_id)
    or address is null or length(btrim(address)) not between 1 and 250
    or email is null or length(email) > 254
    or btrim(email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid issuer name, tax id, address, email or reason' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('expected_version', expected_version,
    'legal_name', btrim(legal_name), 'tax_id', tax_id, 'address', btrim(address),
    'email', btrim(email), 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous from public.saas_billing_operations o
  where o.operation_id = save_saas_billing_issuer.operation_id;
  if found then
    if previous.action <> 'save_issuer' or previous.actor_user_id <> auth.uid()
      or previous.payload <> request_payload then
      raise exception 'Operation id used with a different payload' using errcode = '23505';
    end if;
    return previous.result;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('saas-billing-issuer', 0));
  select s.issuer_version_id into current_version from public.saas_billing_settings s where s.singleton;
  if current_version is distinct from expected_version then
    raise exception 'Issuer version changed; reload before saving' using errcode = '40001';
  end if;
  insert into public.saas_issuer_versions(legal_name, tax_id, address, email, created_by)
  values (btrim(legal_name), tax_id, btrim(address), btrim(email), auth.uid()) returning * into created;
  insert into public.saas_billing_settings(singleton, issuer_version_id) values (true, created.id)
  on conflict (singleton) do update set issuer_version_id = excluded.issuer_version_id, updated_at = now();
  result := jsonb_build_object('issuer', to_jsonb(created) - 'created_by');
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, payload, result)
  values (operation_id, 'save_issuer', auth.uid(), request_payload, result);
  perform public.record_saas_privileged_operation(null, 'saas.issuer_version_created',
    change_reason, 'succeeded', jsonb_build_object('issuer_version_id', created.id, 'previous_version_id', current_version));
  return result;
end;
$$;

revoke all on function public.list_saas_collections(uuid, text, text, text, date, date, integer, integer) from public, anon;
revoke all on function public.get_saas_collection(uuid) from public, anon;
revoke all on function public.get_saas_billing_issuer() from public, anon;
revoke all on function public.save_saas_billing_issuer(uuid, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.list_saas_collections(uuid, text, text, text, date, date, integer, integer) to authenticated;
grant execute on function public.get_saas_collection(uuid) to authenticated;
grant execute on function public.get_saas_billing_issuer() to authenticated;
grant execute on function public.save_saas_billing_issuer(uuid, uuid, text, text, text, text, text) to authenticated;
commit;
