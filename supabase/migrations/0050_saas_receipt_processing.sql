begin;

create table public.saas_document_worker_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  claimed_job uuid references public.saas_billing_jobs(id)
);
alter table public.saas_document_worker_runs enable row level security;
revoke all on public.saas_document_worker_runs from public,anon,authenticated;

create function public.can_read_saas_receipt(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (public.is_platform_admin() or exists (
    select 1 from public.tenant_memberships m where m.tenant_id = target_tenant
      and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active'
  ));
$$;
revoke all on function public.can_read_saas_receipt(uuid) from public,anon,authenticated;

create function public.get_saas_receipt(target_receipt uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  receipt public.saas_payment_receipts;
  result jsonb;
begin
  select * into receipt from public.saas_payment_receipts where id = target_receipt;
  if receipt.id is null or not public.can_read_saas_receipt(receipt.tenant_id) then
    raise exception 'Receipt unavailable' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id',r.id,'tenant_id',r.tenant_id,'invoice_id',r.invoice_id,'folio',r.folio,'snapshot',r.snapshot,'created_at',r.created_at,
    'document',(select to_jsonb(d) from public.saas_receipt_documents d where d.receipt_id = r.id),
    'pdf_job',(select jsonb_build_object('status',j.status,'attempts',j.attempts,'last_error',j.last_error)
      from public.saas_billing_jobs j where j.receipt_id = r.id and j.kind = 'receipt_pdf'),
    'deliveries',case when public.is_platform_admin() then coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'recipient',d.recipient,'status',d.status,'requested_at',d.requested_at,'last_error',d.last_error
    ) order by d.requested_at desc) from public.saas_receipt_deliveries d where d.receipt_id = r.id),'[]'::jsonb) else '[]'::jsonb end,
    'billing_email',case when public.is_platform_admin() then t.billing_contact_email else null end,
    'primary_email',case when public.is_platform_admin() then td.contact_email else null end
  ) into result from public.saas_payment_receipts r join public.tenants t on t.id = r.tenant_id
  left join public.tenant_details td on td.tenant_id = t.id where r.id = target_receipt;
  if public.is_platform_admin() then
    perform public.record_saas_privileged_operation(receipt.tenant_id,'saas.receipt_read','Consultar comprobante','succeeded',
      jsonb_build_object('receipt_id',receipt.id));
  end if;
  return result;
end;
$$;

create function public.list_saas_invoice_receipts(target_invoice uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  tenant uuid;
begin
  select tenant_id into tenant from public.saas_invoices where id = target_invoice;
  if tenant is null or not public.can_read_saas_receipt(tenant) then
    raise exception 'Invoice unavailable' using errcode = '42501';
  end if;
  return jsonb_build_object('receipts',coalesce((select jsonb_agg(jsonb_build_object(
    'id',r.id,'folio',r.folio,'total',r.total,'created_at',r.created_at,
    'ready',exists(select 1 from public.saas_receipt_documents d where d.receipt_id = r.id)
  ) order by r.created_at desc) from public.saas_payment_receipts r where r.invoice_id = target_invoice),'[]'::jsonb));
end;
$$;

create function public.authorize_saas_receipt_download(target_receipt uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  r public.saas_payment_receipts;
  d public.saas_receipt_documents;
begin
  select * into r from public.saas_payment_receipts where id = target_receipt;
  if r.id is null or not public.can_read_saas_receipt(r.tenant_id) then
    raise exception 'Receipt unavailable' using errcode = '42501';
  end if;
  select * into d from public.saas_receipt_documents where receipt_id = r.id;
  if d.receipt_id is null then raise exception 'Document not ready' using errcode = 'P0002'; end if;
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,metadata)
  values (r.tenant_id,auth.uid(),'saas.receipt_download','saas_receipt',r.id::text,jsonb_build_object('sha256',d.sha256));
  return jsonb_build_object('receipt_id',r.id,'folio',r.folio,'storage_path',d.storage_path,'sha256',d.sha256,'byte_size',d.byte_size);
end;
$$;

create function public.request_saas_receipt_delivery(
  target_receipt uuid,operation_id uuid,recipient text,recipient_source text,fallback_approved boolean
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  r public.saas_payment_receipts;
  previous public.saas_billing_operations;
  payload jsonb;
  result jsonb;
  delivery uuid;
  billing_email text;
  primary_email text;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or recipient is null or length(recipient) > 254
    or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or recipient_source is null or recipient_source not in ('billing','primary_contact') then
    raise exception 'Invalid delivery request' using errcode = '22023';
  end if;
  payload := jsonb_build_object('receipt',target_receipt,'recipient',recipient,
    'source',recipient_source,'fallback_approved',fallback_approved);
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text,0));
  select * into previous from public.saas_billing_operations o where o.operation_id = request_saas_receipt_delivery.operation_id;
  if found then
    if previous.action <> 'receipt_delivery' or previous.actor_user_id <> auth.uid() or previous.payload <> payload then
      raise exception 'Operation reused with different payload' using errcode = '23505';
    end if;
    return previous.result;
  end if;
  select * into r from public.saas_payment_receipts where id = target_receipt for update;
  if r.id is null or not exists(select 1 from public.saas_receipt_documents where receipt_id = r.id) then
    raise exception 'Receipt PDF not ready' using errcode = '22023';
  end if;
  if exists(select 1 from public.saas_receipt_deliveries d where d.receipt_id = r.id and d.status in ('queued','sending','unknown')) then
    raise exception 'An outstanding or uncertain delivery requires reconciliation' using errcode = '40001';
  end if;
  select nullif(btrim(t.billing_contact_email),''),nullif(btrim(d.contact_email),'')
  into billing_email,primary_email from public.tenants t left join public.tenant_details d on d.tenant_id = t.id where t.id = r.tenant_id;
  if (billing_email is not null and (recipient_source <> 'billing' or recipient <> billing_email))
    or (billing_email is null and (recipient_source <> 'primary_contact' or primary_email is null
      or recipient <> primary_email or fallback_approved is distinct from true)) then
    raise exception 'Recipient changed or fallback not approved' using errcode = '40001';
  end if;
  insert into public.saas_receipt_deliveries(receipt_id,operation_id,recipient,recipient_source,fallback_approved,requested_by)
  values (r.id,operation_id,recipient,recipient_source,fallback_approved,auth.uid()) returning id into delivery;
  insert into public.saas_billing_jobs(kind,receipt_id,delivery_id,deduplication_key)
  values ('receipt_email',r.id,delivery,'email:' || delivery::text);
  result := jsonb_build_object('delivery_id',delivery,'status','queued');
  insert into public.saas_billing_operations(operation_id,action,actor_user_id,tenant_id,payload,result)
  values (operation_id,'receipt_delivery',auth.uid(),r.tenant_id,payload,result);
  perform public.record_saas_privileged_operation(r.tenant_id,'saas.receipt_delivery_requested',
    'Envio explicito de comprobante','succeeded',jsonb_build_object('receipt_id',r.id,'delivery_id',delivery));
  return result;
end;
$$;

create function public.reconcile_saas_receipt_delivery(
  target_delivery uuid,confirmed_provider_id text,confirmed_not_sent boolean,change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  delivery public.saas_receipt_deliveries;
  tenant uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if change_reason is null or length(btrim(change_reason)) not between 3 and 500
    or confirmed_not_sent is null
    or (confirmed_not_sent and confirmed_provider_id is not null)
    or (not confirmed_not_sent and coalesce(length(btrim(confirmed_provider_id)),0) not between 1 and 200) then
    raise exception 'Provider reconciliation evidence required' using errcode = '22023';
  end if;
  select * into delivery from public.saas_receipt_deliveries where id = target_delivery for update;
  if delivery.id is null or delivery.status <> 'unknown' then
    raise exception 'Only uncertain deliveries can be reconciled' using errcode = '40001';
  end if;
  update public.saas_receipt_deliveries set status = case when confirmed_not_sent then 'failed' else 'accepted' end,
    provider_id = confirmed_provider_id,accepted_at = case when confirmed_not_sent then null else now() end,
    last_error = case when confirmed_not_sent then 'RECONCILED_NOT_SENT' else null end where id = delivery.id;
  update public.saas_billing_jobs set status = case when confirmed_not_sent then 'failed' else 'succeeded' end,
    completed_at = case when confirmed_not_sent then null else now() end,last_error = null
  where delivery_id = delivery.id and status = 'unknown';
  select tenant_id into tenant from public.saas_payment_receipts where id = delivery.receipt_id;
  perform public.record_saas_privileged_operation(tenant,'saas.receipt_delivery_reconciled',change_reason,'succeeded',
    jsonb_build_object('delivery_id',delivery.id,'confirmed_not_sent',confirmed_not_sent));
  return jsonb_build_object('status',case when confirmed_not_sent then 'failed' else 'accepted' end);
end;
$$;

create function public.retry_saas_receipt_pdf(target_receipt uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  r public.saas_payment_receipts;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  select * into r from public.saas_payment_receipts where id = target_receipt for update;
  if r.id is null then raise exception 'Receipt missing' using errcode = 'P0002'; end if;
  if exists(select 1 from public.saas_receipt_documents where receipt_id = r.id) then
    return jsonb_build_object('status','ready');
  end if;
  update public.saas_billing_jobs set status = 'queued',attempts = 0,available_at = now(),last_error = null
  where receipt_id = r.id and kind = 'receipt_pdf' and status = 'failed';
  if not found and not exists(select 1 from public.saas_billing_jobs
    where receipt_id = r.id and kind = 'receipt_pdf' and status = 'queued') then
    raise exception 'PDF is running or requires reconciliation' using errcode = '40001';
  end if;
  perform public.record_saas_privileged_operation(r.tenant_id,'saas.receipt_pdf_retry','Reintentar PDF','succeeded',
    jsonb_build_object('receipt_id',r.id));
  return jsonb_build_object('status','queued');
end;
$$;

create function public.claim_saas_billing_job()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  j public.saas_billing_jobs;
  token uuid := gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Worker only' using errcode = '42501'; end if;
  -- Email lease expiry is ambiguous: never send it automatically a second time.
  with expired as (
    update public.saas_billing_jobs set status = 'unknown',lease_token = null,lease_expires_at = null,
      last_error = 'LEASE_EXPIRED_RECONCILE'
    where kind = 'receipt_email' and status = 'running' and lease_expires_at < now()
    returning delivery_id
  )
  update public.saas_receipt_deliveries set status = 'unknown',last_error = 'LEASE_EXPIRED_RECONCILE'
  where id in (select delivery_id from expired);
  update public.saas_billing_jobs set status = 'failed',lease_token = null,lease_expires_at = null,
    last_error = 'RETRIES_EXHAUSTED'
  where kind = 'receipt_pdf' and status = 'running' and lease_expires_at < now() and attempts >= max_attempts;
  select * into j from public.saas_billing_jobs
  where ((status = 'queued' and available_at <= now())
    or (kind = 'receipt_pdf' and status = 'running' and lease_expires_at < now()))
    and attempts < max_attempts order by available_at,created_at,id for update skip locked limit 1;
  insert into public.saas_document_worker_runs(claimed_job) values (j.id);
  if j.id is null then return jsonb_build_object('job',null); end if;
  update public.saas_billing_jobs set status = 'running',attempts = attempts + 1,lease_token = token,
    lease_expires_at = now() + interval '5 minutes',last_error = null where id = j.id returning * into j;
  if j.delivery_id is not null then update public.saas_receipt_deliveries set status = 'sending' where id = j.delivery_id; end if;
  return jsonb_build_object('job',to_jsonb(j),
    'receipt',(select jsonb_build_object('id',r.id,'tenant_id',r.tenant_id,'folio',r.folio,'snapshot',r.snapshot,'created_at',r.created_at)
      from public.saas_payment_receipts r where r.id = j.receipt_id),
    'document',(select to_jsonb(d) from public.saas_receipt_documents d where d.receipt_id = j.receipt_id),
    'delivery',(select jsonb_build_object('id',d.id,'recipient',d.recipient,'operation_id',d.operation_id)
      from public.saas_receipt_deliveries d where d.id = j.delivery_id));
end;
$$;

create function public.finish_saas_billing_job(
  target_job uuid,target_lease uuid,outcome text,document_path text,document_hash text,
  document_size integer,provider_id text,error_code text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  j public.saas_billing_jobs;
  next_status text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Worker only' using errcode = '42501'; end if;
  select * into j from public.saas_billing_jobs where id = target_job for update;
  if j.id is null or j.status <> 'running' or j.lease_token is distinct from target_lease or j.lease_expires_at < now() then
    raise exception 'Lease no longer owned' using errcode = '40001';
  end if;
  if outcome is null or outcome not in ('succeeded','failed','unknown')
    or (outcome <> 'succeeded' and (error_code is null or error_code !~ '^[A-Z0-9_]{1,80}$')) then
    raise exception 'Invalid worker outcome' using errcode = '22023';
  end if;
  if outcome = 'succeeded' and j.kind = 'receipt_pdf' then
    if document_path is distinct from j.receipt_id::text || '/v1.pdf'
      or document_hash is null or document_hash !~ '^[a-f0-9]{64}$' or document_size is null or document_size not between 1 and 10485760 then
      raise exception 'Invalid PDF metadata' using errcode = '22023';
    end if;
    insert into public.saas_receipt_documents(receipt_id,storage_path,sha256,byte_size)
    values (j.receipt_id,document_path,document_hash,document_size);
  elsif outcome = 'succeeded' and j.kind = 'receipt_email' then
    if provider_id is null or length(provider_id) not between 1 and 200 then
      raise exception 'Provider confirmation required' using errcode = '22023';
    end if;
    update public.saas_receipt_deliveries set status = 'accepted',
      provider_id = finish_saas_billing_job.provider_id,accepted_at = now(),last_error = null where id = j.delivery_id;
  elsif j.kind = 'receipt_email' then
    update public.saas_receipt_deliveries set status = case when outcome = 'unknown' then 'unknown' else 'failed' end,
      last_error = error_code where id = j.delivery_id;
  end if;
  next_status := case when outcome = 'failed' and j.kind = 'receipt_pdf' and j.attempts < j.max_attempts then 'queued' else outcome end;
  update public.saas_billing_jobs set status = next_status,lease_token = null,lease_expires_at = null,
    completed_at = case when outcome = 'succeeded' then now() else null end,last_error = error_code,
    available_at = now() + make_interval(secs => 60 * power(2,j.attempts)::integer)
  where id = j.id;
  return jsonb_build_object('status',next_status);
end;
$$;

create function public.get_saas_document_processor_status()
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(null,'saas.document_processor_read','Consultar procesador PDF y correo','succeeded');
  return jsonb_build_object('last_worker_at',(select max(started_at) from public.saas_document_worker_runs),
    'queued',(select count(*) from public.saas_billing_jobs where status = 'queued'),
    'failed',(select count(*) from public.saas_billing_jobs where status = 'failed'),
    'unknown',(select count(*) from public.saas_billing_jobs where status = 'unknown'));
end;
$$;

revoke all on function public.get_saas_receipt(uuid) from public,anon;
revoke all on function public.list_saas_invoice_receipts(uuid) from public,anon;
revoke all on function public.authorize_saas_receipt_download(uuid) from public,anon;
revoke all on function public.request_saas_receipt_delivery(uuid,uuid,text,text,boolean) from public,anon;
revoke all on function public.retry_saas_receipt_pdf(uuid) from public,anon;
revoke all on function public.get_saas_document_processor_status() from public,anon;
revoke all on function public.reconcile_saas_receipt_delivery(uuid,text,boolean,text) from public,anon;
grant execute on function public.reconcile_saas_receipt_delivery(uuid,text,boolean,text) to authenticated;
grant execute on function public.get_saas_receipt(uuid),public.list_saas_invoice_receipts(uuid),
  public.authorize_saas_receipt_download(uuid),public.retry_saas_receipt_pdf(uuid),
  public.get_saas_document_processor_status() to authenticated;
grant execute on function public.request_saas_receipt_delivery(uuid,uuid,text,text,boolean) to authenticated;
revoke all on function public.claim_saas_billing_job() from public,anon,authenticated;
revoke all on function public.finish_saas_billing_job(uuid,uuid,text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.claim_saas_billing_job(),
  public.finish_saas_billing_job(uuid,uuid,text,text,text,integer,text,text) to service_role;
commit;
