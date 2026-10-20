-- Disposable Supabase database only. Requires migrations through 0052.
-- This script is prepared for the deferred PostgreSQL verification, not a substitute for it.
begin;
insert into auth.users(id,email)
select ('ad490000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'billing-fixture-' || n || '@example.invalid'
from generate_series(1,7) n;
insert into public.platform_admins(id) values
  ('ad490000-0000-4000-8000-000000000001'),('ad490000-0000-4000-8000-000000000007');
insert into public.tenants(id,name,status,billing_contact_email) values
  ('ad490000-0000-4000-8000-000000000011','Billing fixture','active','billing@example.invalid'),
  ('ad490000-0000-4000-8000-000000000012','Foreign billing fixture','active',null);
insert into public.tenant_memberships(tenant_id,user_id,role,status)
select 'ad490000-0000-4000-8000-000000000011',('ad490000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  case n when 2 then 'owner' when 3 then 'admin' when 4 then 'instructor' else 'assistant' end,'active'
from generate_series(2,5) n;
insert into public.tenant_memberships(tenant_id,user_id,role,status)
values ('ad490000-0000-4000-8000-000000000012','ad490000-0000-4000-8000-000000000006','owner','active');
insert into public.tenant_details(tenant_id,contact_email)
values ('ad490000-0000-4000-8000-000000000011','primary@example.invalid');
select set_config('request.jwt.claim.sub','ad490000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$
declare
  version_id uuid;
  quote jsonb;
  assigned jsonb;
begin
  perform public.save_saas_billing_issuer(gen_random_uuid(),(public.get_saas_billing_issuer()->'issuer'->>'id')::uuid,
    'Original issuer','12345678-5','Ñuble 123','issuer@example.invalid','Billing test issuer');
  version_id := (public.publish_saas_plan_version(null,null,gen_random_uuid(),
    '{"name":"Billing plan","price":11900,"duration_unit":"months","duration_count":1,
      "trial_days":0,"max_students":100,"max_users":10,"features":[],"services":["Capacitación"]}',
    'Billing test plan')->>'version_id')::uuid;
  quote := public.preview_saas_subscription_assignment('ad490000-0000-4000-8000-000000000011',version_id,
    (now() at time zone 'America/Santiago')::date,false,null);
  assigned := public.confirm_saas_subscription_assignment('ad490000-0000-4000-8000-000000000011',version_id,
    (now() at time zone 'America/Santiago')::date,false,null,quote->>'fingerprint',gen_random_uuid(),'Billing assignment');
  perform set_config('test.invoice',assigned->>'invoice_id',true);
  perform set_config('test.subscription',assigned->>'subscription_id',true);
  perform set_config('test.operation',gen_random_uuid()::text,true);
end;
$$;
reset role;
-- Another overdue invoice must remain visible after settling the first one.
insert into public.saas_invoices(id,tenant_id,subscription_id,invoice_number,status,amount,currency,
  period_starts_on,period_ends_on,due_on,issued_at)
values ('ad490000-0000-4000-8000-000000000021','ad490000-0000-4000-8000-000000000011',
  current_setting('test.subscription')::uuid,'BILLING-REMAINING','open',5000,'CLP',current_date,current_date+29,current_date-1,now()-interval '1 day');
set local role authenticated;
do $$
declare
  result jsonb;
  invoice uuid := current_setting('test.invoice')::uuid;
  operation uuid := current_setting('test.operation')::uuid;
  today date := (now() at time zone 'America/Santiago')::date;
begin
  begin
    perform public.record_saas_manual_payment(invoice,11899,today,'cash',null,gen_random_uuid(),'Partial attempt');
    raise exception 'Partial payment accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.record_saas_manual_payment(invoice,11901,today,'cash',null,gen_random_uuid(),'Overpayment attempt');
    raise exception 'Overpayment accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.record_saas_manual_payment(invoice,11900,today+1,'cash',null,gen_random_uuid(),'Future payment');
    raise exception 'Future payment accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_saas_manual_payment(invoice,11900,today,'transfer',null,gen_random_uuid(),'No reference');
    raise exception 'Transfer without reference accepted';
  exception when invalid_parameter_value then null; end;
  result := public.record_saas_manual_payment(invoice,11900,today,'transfer','BANK-1',operation,'Verified transfer');
  if result is distinct from public.record_saas_manual_payment(invoice,11900,today,'transfer','BANK-1',operation,'Verified transfer') then
    raise exception 'Idempotent payment changed';
  end if;
  perform set_config('test.receipt',result->>'receipt_id',true);
  begin
    perform public.record_saas_manual_payment(invoice,11900,today,'transfer','BANK-2',operation,'Verified transfer');
    raise exception 'Operation payload reuse accepted';
  exception when unique_violation then null; end;
  begin
    perform public.void_saas_invoice(invoice,gen_random_uuid(),'Invalid paid void');
    raise exception 'Paid invoice void accepted';
  exception when serialization_failure then null; end;
  result := public.get_saas_receipt((result->>'receipt_id')::uuid);
  if result->'snapshot'->>'net' <> '10000' or result->'snapshot'->>'vat' <> '1900'
    or result->'snapshot'->>'total' <> '11900' or result->'pdf_job'->>'status' <> 'queued' then
    raise exception 'Payment/receipt/outbox atomic contract differs';
  end if;
  begin
    perform public.request_saas_receipt_delivery(current_setting('test.receipt')::uuid,gen_random_uuid(),'billing@example.invalid','billing',false);
    raise exception 'Email queued without PDF';
  exception when invalid_parameter_value then null; end;
end;
$$;
reset role;
do $$
begin
  if (select count(*) from public.saas_payment_receipts where invoice_id = current_setting('test.invoice')::uuid) <> 1
    or (select payment_status from public.saas_subscriptions where id = current_setting('test.subscription')::uuid) <> 'partial' then
    raise exception 'Payment duplicated or concealed another debt';
  end if;
end;
$$;
-- Force an outbox failure after payment writes: the entire operation must roll back.
create function pg_temp.reject_billing_job() returns trigger language plpgsql as $$
begin raise exception 'Synthetic outbox failure' using errcode = 'P0001'; end;
$$;
create trigger test_reject_billing_job before insert on public.saas_billing_jobs
for each row execute function pg_temp.reject_billing_job();
set local role authenticated;
do $$
begin
  begin
    perform public.record_saas_manual_payment('ad490000-0000-4000-8000-000000000021',5000,
      (now() at time zone 'America/Santiago')::date,'cash',null,gen_random_uuid(),'Rollback fixture');
    raise exception 'Outbox failure did not abort payment' using errcode = '23514';
  exception when raise_exception then
    if sqlerrm <> 'Synthetic outbox failure' then raise; end if;
  end;
end;
$$;
reset role;
drop trigger test_reject_billing_job on public.saas_billing_jobs;
do $$
begin
  if exists(select 1 from public.saas_charges where invoice_id = 'ad490000-0000-4000-8000-000000000021')
    or (select status from public.saas_invoices where id = 'ad490000-0000-4000-8000-000000000021') <> 'open' then
    raise exception 'Failed transaction left a charge or settled invoice';
  end if;
end;
$$;
-- Claims and acknowledgements are service-only; PDF failures do not alter payment.
select set_config('request.jwt.claim.role','service_role',true);
set local role service_role;
do $$
declare j jsonb;
begin
  j := public.claim_saas_billing_job();
  perform set_config('test.job',j->'job'->>'id',true);
  begin
    perform public.finish_saas_billing_job((j->'job'->>'id')::uuid,null,'succeeded',null,null,null,null,null);
    raise exception 'Null lease accepted';
  exception when serialization_failure then null; end;
  perform public.finish_saas_billing_job((j->'job'->>'id')::uuid,(j->'job'->>'lease_token')::uuid,
    'failed',null,null,null,null,'STORAGE_UNAVAILABLE');
end;
$$;
reset role;
update public.saas_billing_jobs set attempts = max_attempts,status = 'failed'
where id = current_setting('test.job')::uuid;
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.retry_saas_receipt_pdf(current_setting('test.receipt')::uuid);
reset role;
select set_config('request.jwt.claim.role','service_role',true);
set local role service_role;
do $$
declare j jsonb;
begin
  j := public.claim_saas_billing_job();
  perform public.finish_saas_billing_job((j->'job'->>'id')::uuid,(j->'job'->>'lease_token')::uuid,
    'succeeded',current_setting('test.receipt') || '/v1.pdf',repeat('a',64),100,null,null);
end;
$$;
reset role;
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$
declare r jsonb; operation uuid := gen_random_uuid();
begin
  begin
    perform public.request_saas_receipt_delivery(current_setting('test.receipt')::uuid,gen_random_uuid(),
      'primary@example.invalid','primary_contact',true);
    raise exception 'Primary email bypassed existing billing email';
  exception when serialization_failure then null; end;
  r := public.request_saas_receipt_delivery(current_setting('test.receipt')::uuid,operation,'billing@example.invalid','billing',false);
  if r is distinct from public.request_saas_receipt_delivery(current_setting('test.receipt')::uuid,operation,'billing@example.invalid','billing',false) then
    raise exception 'Email operation duplicated';
  end if;
  perform set_config('test.delivery',r->>'delivery_id',true);
end;
$$;
reset role;
select set_config('request.jwt.claim.role','service_role',true);
set local role service_role;
select public.claim_saas_billing_job();
reset role;
update public.saas_billing_jobs set lease_expires_at = now()-interval '1 minute'
where delivery_id = current_setting('test.delivery')::uuid;
set local role service_role;
select public.claim_saas_billing_job(); -- Expired email must become unknown, never automatically reclaimed.
reset role;
do $$
begin
  if (select status from public.saas_receipt_deliveries where id = current_setting('test.delivery')::uuid) <> 'unknown' then
    raise exception 'Expired email was automatically retried';
  end if;
end;
$$;
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.reconcile_saas_receipt_delivery(current_setting('test.delivery')::uuid,'verified-provider-id',false,'Verified provider acceptance');
reset role;
update public.tenants set status = 'suspended' where id = 'ad490000-0000-4000-8000-000000000011';
-- Active suspended owner may read; other tenant and operational roles may not.
select set_config('request.jwt.claim.sub','ad490000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$
declare r jsonb;
begin
  r := public.get_my_saas_billing('ad490000-0000-4000-8000-000000000011',1);
  if r->>'tenant_status' <> 'suspended' or (r->>'total')::integer <> 2 then raise exception 'Suspended owner billing denied'; end if;
  perform public.authorize_saas_receipt_download(current_setting('test.receipt')::uuid);
end;
$$;
reset role;
do $$
declare n integer;
begin
  for n in 3..6 loop
    perform set_config('request.jwt.claim.sub',('ad490000-0000-4000-8000-' || lpad(n::text,12,'0')),true);
    begin
      perform public.get_my_saas_billing('ad490000-0000-4000-8000-000000000011',1);
      raise exception 'Unauthorized role read billing';
    exception when insufficient_privilege then null; end;
    begin
      perform public.authorize_saas_receipt_download(current_setting('test.receipt')::uuid);
      raise exception 'Unauthorized role downloaded PDF';
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
update public.tenant_memberships set status = 'revoked'
where tenant_id = 'ad490000-0000-4000-8000-000000000011' and user_id = 'ad490000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','ad490000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$
begin
  begin
    perform public.get_my_saas_billing('ad490000-0000-4000-8000-000000000011',1);
    raise exception 'Revoked owner read billing';
  exception when insufficient_privilege then null; end;
  begin
    perform public.claim_saas_billing_job();
    raise exception 'Authenticated user claimed privileged job';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','ad490000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$
declare r record; detail jsonb; period date := date_trunc('month',now() at time zone 'UTC')::date;
begin
  for r in select * from public.get_saas_financial_dashboard(period) loop
    detail := public.get_saas_financial_ledger(period,r.currency,'collected',1);
    if (detail->>'amount')::numeric is distinct from r.collected_net then raise exception 'Collected ledger/dashboard mismatch'; end if;
    detail := public.get_saas_financial_ledger(period,r.currency,'pending',1);
    if (detail->>'amount')::numeric is distinct from r.pending_amount then raise exception 'Pending ledger/dashboard mismatch'; end if;
    detail := public.get_saas_financial_ledger(period,r.currency,'past_due',1);
    if (detail->>'amount')::numeric is distinct from r.past_due_amount then raise exception 'Overdue ledger/dashboard mismatch'; end if;
    detail := public.get_saas_financial_ledger(period,r.currency,'mrr',1);
    if (detail->>'amount')::numeric is distinct from r.mrr then raise exception 'MRR ledger/dashboard mismatch'; end if;
  end loop;
end;
$$;
reset role;
rollback;
