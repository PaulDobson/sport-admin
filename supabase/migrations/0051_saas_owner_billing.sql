begin;
create function public.get_my_saas_billing(target_tenant uuid,page_number integer default 1)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or page_number is null or page_number not between 1 and 1000000 then
    raise exception 'Invalid billing request' using errcode = '22023';
  end if;
  if not exists(select 1 from public.tenant_memberships where tenant_id = target_tenant
    and user_id = auth.uid() and role = 'owner' and status = 'active') then
    raise exception 'Active owner membership required' using errcode = '42501';
  end if;
  with chosen_subscription as materialized (
    select * from public.saas_subscriptions where tenant_id = target_tenant
    order by (status in ('trial','active','past_due','suspended')) desc,created_at desc,id limit 1
  )
  select jsonb_build_object(
    'tenant_id',t.id,'tenant_name',t.name,'tenant_status',t.status,
    'owner_tenants',(select jsonb_agg(jsonb_build_object('id',owned.id,'name',owned.name) order by owned.name,owned.id)
      from public.tenants owned where exists(select 1 from public.tenant_memberships m
        where m.tenant_id = owned.id and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active')),
    'balances',coalesce((select jsonb_agg(to_jsonb(debt) order by currency) from (
      select currency,sum(balance) as amount from public.saas_collection_balances where tenant_id = target_tenant
        and balance > 0 group by currency) debt),'[]'::jsonb),
    'subscription',case when subscription.id is null then null else jsonb_build_object(
      'id',subscription.id,'status',subscription.status,'payment_status',subscription.payment_status,
      'plan_name',subscription.contract_snapshot->>'name','price',subscription.price,'currency',subscription.currency,
      'period_starts_on',subscription.current_period_starts_on,'period_end_exclusive',subscription.current_period_end_exclusive,
      'duration_unit',subscription.duration_unit,'duration_count',subscription.duration_count,
      'services',coalesce(subscription.contract_snapshot->'services','[]'::jsonb),
      'max_students',(subscription.contract_snapshot->>'max_students')::integer,
      'max_users',(subscription.contract_snapshot->>'max_users')::integer,
      'features',coalesce(subscription.contract_snapshot->'features','[]'::jsonb)) end,
    'scheduled_change',(select jsonb_build_object('effective_on',c.effective_on,'status',c.status,'plan_name',v.name,
      'price',v.price,'currency',v.currency,'blocked_reason',c.blocked_reason)
      from public.saas_scheduled_plan_changes c join public.saas_plan_versions v on v.id = c.plan_version_id
      where c.tenant_id = target_tenant and c.status in ('scheduled','blocked') order by c.created_at desc,c.id limit 1),
    'page',page_number,'total',(select count(*) from public.saas_invoices where tenant_id = target_tenant),
    'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by i.issued_at desc nulls last,i.id)
      from (select b.*,
        (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'folio',r.folio,'total',r.total,
          'ready',exists(select 1 from public.saas_receipt_documents d where d.receipt_id = r.id))
          order by r.created_at desc),'[]'::jsonb) from public.saas_payment_receipts r where r.invoice_id = b.id) as receipts,
        (select coalesce(jsonb_agg(jsonb_build_object('amount',c.amount,'currency',c.currency,
          'occurred_at',c.occurred_at,'status',c.status) order by c.occurred_at desc),'[]'::jsonb)
          from public.saas_charges c where c.invoice_id = b.id and c.tenant_id = target_tenant
            and c.status in ('succeeded','refunded')) as payments
        from public.saas_collection_balances b where b.tenant_id = target_tenant
        order by b.issued_at desc nulls last,b.id limit 20 offset (page_number-1)*20) i),'[]'::jsonb)
  ) into result from public.tenants t left join chosen_subscription subscription on true where t.id = target_tenant;
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,metadata)
  values (target_tenant,auth.uid(),'saas.owner_billing_read','tenant',target_tenant::text,jsonb_build_object('page',page_number));
  return result;
end;
$$;
revoke all on function public.get_my_saas_billing(uuid,integer) from public,anon;
grant execute on function public.get_my_saas_billing(uuid,integer) to authenticated;
commit;
