begin;

create index saas_billing_jobs_status_history_idx
  on public.saas_billing_jobs(status, created_at desc, id);

create function public.list_saas_document_jobs(
  tenant_query text, target_kind text, target_status text,
  page_number integer, page_size integer
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
    or target_kind is null or target_kind not in ('all','receipt_pdf','receipt_email')
    or target_status is null or target_status not in ('attention','all','queued','running','succeeded','failed','unknown')
    or (tenant_query is not null and length(tenant_query) > 160) then
    raise exception 'Invalid document job filters' using errcode = '22023';
  end if;

  with filtered as materialized (
    select j.id, j.kind, j.status, j.receipt_id, r.folio,
      r.tenant_id, t.name as tenant_name, j.attempts, j.max_attempts,
      j.available_at, j.lease_expires_at, j.last_error, j.created_at, j.completed_at,
      (j.status = 'running' and j.lease_expires_at <= now()) as lease_expired
    from public.saas_billing_jobs j
    join public.saas_payment_receipts r on r.id = j.receipt_id
    join public.tenants t on t.id = r.tenant_id
    where (target_kind = 'all' or j.kind = target_kind)
      and (target_status = 'all' or j.status = target_status
        or (target_status = 'attention' and (j.status in ('failed','unknown')
          or (j.status = 'running' and j.lease_expires_at <= now()))))
      and (nullif(btrim(tenant_query), '') is null
        or strpos(lower(t.name), lower(btrim(tenant_query))) > 0)
  ), paged as (
    select * from filtered
    order by created_at desc, id
    limit page_size offset (page_number - 1) * page_size
  )
  select jsonb_build_object(
    'queried_at', now(), 'page', page_number, 'page_size', page_size,
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc, p.id)
      from paged p), '[]'::jsonb)
  ) into result;

  perform public.record_saas_privileged_operation(null, 'saas.document_jobs_read',
    'Consultar trabajos PDF y correo', 'succeeded', jsonb_build_object(
      'kind', target_kind, 'status', target_status, 'page', page_number, 'page_size', page_size));
  return result;
end;
$$;

revoke all on function public.list_saas_document_jobs(text,text,text,integer,integer)
  from public, anon;
grant execute on function public.list_saas_document_jobs(text,text,text,integer,integer)
  to authenticated;

commit;
