begin;

create function public.refresh_saas_subscription_payment(target_subscription uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  has_debt boolean;
  has_overdue boolean;
  has_payment boolean;
begin
  perform 1 from public.saas_subscriptions where id = target_subscription for update;
  select coalesce(bool_or(balance > 0), false),
    coalesce(bool_or(balance > 0 and status = 'past_due'), false),
    coalesce(bool_or(confirmed_amount > 0 or imported_settlement), false)
  into has_debt, has_overdue, has_payment
  from public.saas_collection_balances where subscription_id = target_subscription;
  update public.saas_subscriptions set payment_status = case
    when has_debt and has_payment then 'partial'
    when has_debt then 'pending'
    when has_payment then 'paid' else 'not_due' end,
    status = case when status in ('active','past_due') then
      case when has_overdue then 'past_due' else 'active' end else status end
  where id = target_subscription;
end;
$$;

-- Both manual payments and the existing provider RPC pass through this guard.
create function public.guard_saas_charge_settlement()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  invoice public.saas_invoices;
  subscription uuid;
  paid numeric;
begin
  if new.status <> 'succeeded' then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('succeeded','refunded') then return new; end if;
  select subscription_id into subscription from public.saas_invoices where id = new.invoice_id and tenant_id = new.tenant_id;
  perform 1 from public.saas_subscriptions where id = subscription for update;
  select * into invoice from public.saas_invoices where id = new.invoice_id and tenant_id = new.tenant_id for update;
  if not found or invoice.status not in ('open','past_due') or invoice.currency <> new.currency then
    raise exception 'Invoice cannot accept a payment' using errcode = '23514';
  end if;
  select coalesce(sum(c.amount), 0) into paid from public.saas_charges c
  where c.invoice_id = invoice.id and c.tenant_id = invoice.tenant_id and c.id <> new.id
    and c.currency = invoice.currency and c.status in ('succeeded','refunded');
  if new.amount > invoice.amount - paid then
    raise exception 'Payment exceeds remaining invoice balance' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger guard_saas_charge_settlement before insert or update of status on public.saas_charges
for each row execute function public.guard_saas_charge_settlement();

create function public.enqueue_saas_payment_receipt(target_charge uuid,receipt_method text,receipt_reference text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  charge public.saas_charges;
  invoice public.saas_invoices;
  issuer public.saas_issuer_versions;
  tenant public.tenants;
  receipt uuid;
  net numeric;
begin
  select * into charge from public.saas_charges where id = target_charge for update;
  if charge.id is null or charge.status not in ('succeeded','refunded') then
    raise exception 'Confirmed charge required' using errcode = '23514';
  end if;
  select id into receipt from public.saas_payment_receipts where charge_id = charge.id;
  if receipt is not null then return receipt; end if;
  if charge.currency <> 'CLP' then return null; end if;
  if charge.amount <> trunc(charge.amount) or charge.amount > 9999999999 then
    raise exception 'Whole CLP amount required for receipt' using errcode = '23514';
  end if;
  select * into invoice from public.saas_invoices where id = charge.invoice_id and tenant_id = charge.tenant_id;
  select v.* into issuer from public.saas_billing_settings s join public.saas_issuer_versions v on v.id = s.issuer_version_id where s.singleton;
  if issuer.id is null or not public.is_valid_saas_issuer_tax_id(issuer.tax_id) then
    raise exception 'Configure a valid billing issuer before recording payment' using errcode = '22023';
  end if;
  select * into tenant from public.tenants where id = charge.tenant_id;
  net := round(charge.amount * 100 / 119);
  insert into public.saas_payment_receipts(tenant_id,charge_id,invoice_id,issuer_version_id,snapshot,total,net,vat)
  values (invoice.tenant_id,charge.id,invoice.id,issuer.id,jsonb_build_object(
    'template_version',1,'issuer',to_jsonb(issuer)-'created_by',
    'tenant',jsonb_build_object('name',tenant.name,'tax_id',tenant.billing_tax_id,
      'billing_contact_name',tenant.billing_contact_name,'billing_contact_email',tenant.billing_contact_email,
      'address',(select d.address from public.tenant_details d where d.tenant_id = tenant.id)),
    'invoice_number',invoice.invoice_number,'concept',invoice.invoice_kind,
    'plan_name',coalesce(invoice.contract_snapshot->>'name','Contrato historico'),
    'services',coalesce(invoice.contract_snapshot->'services','[]'::jsonb),
    'period_starts_on',invoice.period_starts_on,'period_end_exclusive',invoice.period_end_exclusive,
    'paid_on',(charge.occurred_at at time zone 'America/Santiago')::date,'method',receipt_method,'reference',receipt_reference,
    'total',charge.amount,'net',net,'vat',charge.amount-net,'currency','CLP','vat_rate',19
  ),charge.amount,net,charge.amount-net) returning id into receipt;
  insert into public.saas_billing_jobs(kind,receipt_id,deduplication_key)
  values ('receipt_pdf',receipt,'pdf:' || receipt::text);
  return receipt;
end;
$$;

alter function public.process_saas_payment_event(text,text,text,text,text,text,text,numeric,text,timestamptz,text)
rename to process_saas_payment_event_legacy;
revoke all on function public.process_saas_payment_event_legacy(text,text,text,text,text,text,text,numeric,text,timestamptz,text)
from public, anon, authenticated, service_role;

create function public.process_saas_payment_event(
  target_provider text, target_external_event_id text, target_event_type text,
  target_external_subscription_id text, target_external_invoice_id text,
  target_external_charge_id text, target_external_refund_id text, target_amount numeric,
  target_currency text, target_occurred_at timestamptz, target_reason text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  event_id uuid;
  subscription public.saas_subscriptions;
  charge uuid;
begin
  select * into subscription from public.saas_subscriptions
  where payment_provider = lower(btrim(target_provider)) and external_subscription_id = btrim(target_external_subscription_id)
  for update;
  event_id := public.process_saas_payment_event_legacy(target_provider,target_external_event_id,target_event_type,
    target_external_subscription_id,target_external_invoice_id,target_external_charge_id,target_external_refund_id,
    target_amount,target_currency,target_occurred_at,target_reason);
  -- The legacy handler marks just one invoice paid; reconcile all outstanding invoices.
  if subscription.id is not null then
    if subscription.status = 'suspended' then
      update public.saas_subscriptions set status = 'suspended' where id = subscription.id;
    end if;
    perform public.refresh_saas_subscription_payment(subscription.id);
    if target_event_type = 'charge.succeeded' then
      -- Historical provider invoices keep their existing document/amount semantics.
      select c.id into charge from public.saas_charges c join public.saas_invoices i on i.id = c.invoice_id
      where c.provider = lower(btrim(target_provider)) and c.external_charge_id = btrim(target_external_charge_id)
        and c.tenant_id = subscription.tenant_id and i.invoice_kind <> 'legacy' and c.currency = 'CLP';
      if charge is not null then
        perform public.enqueue_saas_payment_receipt(charge,'external_provider',btrim(target_external_charge_id));
      end if;
    end if;
  end if;
  return event_id;
end;
$$;

create function public.record_saas_manual_payment(
  target_invoice uuid, expected_amount numeric, paid_on date, payment_method text,
  payment_reference text, operation_id uuid, change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  invoice public.saas_invoices;
  balance public.saas_collection_balances;
  issuer public.saas_issuer_versions;
  tenant public.tenants;
  previous public.saas_billing_operations;
  request_payload jsonb;
  result jsonb;
  charge uuid := gen_random_uuid();
  receipt uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or paid_on is null or paid_on > (now() at time zone 'America/Santiago')::date
    or payment_method is null or payment_method not in ('transfer','cash','external_card')
    or expected_amount is null or expected_amount <= 0 or expected_amount <> trunc(expected_amount)
    or expected_amount > 9999999999 or change_reason is null or length(btrim(change_reason)) not between 3 and 500
    or coalesce(length(payment_reference),0) > 200
    or (payment_method <> 'cash' and coalesce(length(btrim(payment_reference)),0) = 0) then
    raise exception 'Invalid full payment details' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('invoice',target_invoice,'amount',expected_amount,'paid_on',paid_on,
    'method',payment_method,'reference',nullif(btrim(payment_reference),''),'reason',btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text,0));
  select * into previous from public.saas_billing_operations o where o.operation_id = record_saas_manual_payment.operation_id;
  if found then
    if previous.action <> 'manual_payment' or previous.actor_user_id <> auth.uid() or previous.payload <> request_payload then
      raise exception 'Operation reused with different payload' using errcode = '23505';
    end if;
    return previous.result;
  end if;
  select * into invoice from public.saas_invoices where id = target_invoice;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  perform 1 from public.saas_subscriptions where id = invoice.subscription_id for update;
  select * into invoice from public.saas_invoices where id = target_invoice for update;
  select * into balance from public.saas_collection_balances where id = target_invoice;
  if invoice.currency <> 'CLP' or balance.balance <> expected_amount or balance.balance <= 0
    or invoice.status not in ('open','past_due') or balance.in_flight_count > 0
    or paid_on < (invoice.issued_at at time zone 'America/Santiago')::date then
    raise exception 'Invoice balance changed or payment is incompatible' using errcode = '40001';
  end if;
  select v.* into issuer from public.saas_billing_settings s join public.saas_issuer_versions v on v.id = s.issuer_version_id where s.singleton;
  if issuer.id is null or not public.is_valid_saas_issuer_tax_id(issuer.tax_id) then
    raise exception 'Configure a valid billing issuer before recording payment' using errcode = '22023';
  end if;
  select * into tenant from public.tenants where id = invoice.tenant_id;
  insert into public.saas_charges(id,tenant_id,invoice_id,amount,currency,status,operation_id,
    manual_method,manual_reference,recorded_by,occurred_at)
  values (charge,invoice.tenant_id,invoice.id,expected_amount,'CLP','pending',operation_id,
    payment_method,nullif(btrim(payment_reference),''),auth.uid(), paid_on::timestamp at time zone 'America/Santiago');
  update public.saas_charges set status = 'succeeded' where id = charge;
  update public.saas_invoices set status = 'paid', paid_at = paid_on::timestamp at time zone 'America/Santiago' where id = invoice.id;
  perform public.refresh_saas_subscription_payment(invoice.subscription_id);
  receipt := public.enqueue_saas_payment_receipt(charge,payment_method,nullif(btrim(payment_reference),''));
  result := jsonb_build_object('invoice_id',invoice.id,'tenant_id',invoice.tenant_id,'charge_id',charge,
    'receipt_id',receipt,'amount',expected_amount,'status','paid');
  insert into public.saas_billing_operations(operation_id,action,actor_user_id,tenant_id,payload,result)
  values (operation_id,'manual_payment',auth.uid(),invoice.tenant_id,request_payload,result);
  perform public.record_saas_privileged_operation(invoice.tenant_id,'saas.manual_payment',change_reason,'succeeded',
    jsonb_build_object('invoice_id',invoice.id,'charge_id',charge,'receipt_id',receipt,'amount',expected_amount));
  return result;
end;
$$;

create function public.void_saas_invoice(target_invoice uuid,operation_id uuid,change_reason text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  invoice public.saas_invoices;
  previous public.saas_billing_operations;
  request_payload jsonb;
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or change_reason is null or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'Operation and reason required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('invoice',target_invoice,'reason',btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text,0));
  select * into previous from public.saas_billing_operations o where o.operation_id = void_saas_invoice.operation_id;
  if found then
    if previous.action <> 'void_invoice' or previous.actor_user_id <> auth.uid() or previous.payload <> request_payload then
      raise exception 'Operation reused with different payload' using errcode = '23505';
    end if;
    return previous.result;
  end if;
  select * into invoice from public.saas_invoices where id = target_invoice;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  perform 1 from public.saas_subscriptions where id = invoice.subscription_id for update;
  select * into invoice from public.saas_invoices where id = target_invoice for update;
  if invoice.status not in ('draft','open','past_due') or exists (
    select 1 from public.saas_charges where invoice_id = invoice.id and status in ('pending','processing','succeeded','refunded')
  ) then raise exception 'Invoice has payments or operations in progress' using errcode = '40001'; end if;
  update public.saas_invoices set status = 'void' where id = invoice.id;
  perform public.refresh_saas_subscription_payment(invoice.subscription_id);
  result := jsonb_build_object('invoice_id',invoice.id,'status','void');
  insert into public.saas_billing_operations(operation_id,action,actor_user_id,tenant_id,payload,result)
  values (operation_id,'void_invoice',auth.uid(),invoice.tenant_id,request_payload,result);
  perform public.record_saas_privileged_operation(invoice.tenant_id,'saas.invoice_void',change_reason,'succeeded',
    jsonb_build_object('invoice_id',invoice.id));
  return result;
end;
$$;

revoke all on function public.refresh_saas_subscription_payment(uuid) from public,anon,authenticated;
revoke all on function public.guard_saas_charge_settlement() from public,anon,authenticated;
revoke all on function public.enqueue_saas_payment_receipt(uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.record_saas_manual_payment(uuid,numeric,date,text,text,uuid,text) from public,anon;
revoke all on function public.void_saas_invoice(uuid,uuid,text) from public,anon;
grant execute on function public.record_saas_manual_payment(uuid,numeric,date,text,text,uuid,text) to authenticated;
grant execute on function public.void_saas_invoice(uuid,uuid,text) to authenticated;
revoke all on function public.process_saas_payment_event(text,text,text,text,text,text,text,numeric,text,timestamptz,text)
from public,anon,authenticated;
grant execute on function public.process_saas_payment_event(text,text,text,text,text,text,text,numeric,text,timestamptz,text) to service_role;
commit;
