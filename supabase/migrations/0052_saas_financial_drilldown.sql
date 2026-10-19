begin;
create function public.get_saas_financial_ledger(target_period date,target_currency text,target_metric text,page_number integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_period is null or target_period <> date_trunc('month',target_period)::date
    or target_currency is null or target_currency !~ '^[A-Z]{3}$'
    or target_metric is null or target_metric not in ('collected','pending','past_due','mrr')
    or page_number is null or page_number not between 1 and 1000000 then
    raise exception 'Invalid financial ledger filter' using errcode = '22023';
  end if;
  with bounds as (
    select (target_period + interval '1 month - 1 day')::date as ends_on,
      target_period::timestamp at time zone 'UTC' as starts_at,
      (target_period + interval '1 month')::timestamp at time zone 'UTC' as ends_at
  ), balances as (
    select i.id,i.tenant_id,i.invoice_number,i.due_on,
      case when i.invoice_kind = 'legacy' and i.status = 'paid' and i.paid_at < b.ends_at
        and not exists(select 1 from public.saas_charges c where c.invoice_id = i.id
          and c.tenant_id = i.tenant_id and c.status in ('succeeded','refunded')) then 0
      else greatest(0,i.amount-coalesce((select sum(c.amount) from public.saas_charges c
        where c.invoice_id = i.id and c.tenant_id = i.tenant_id and c.currency = i.currency
          and c.status in ('succeeded','refunded') and c.occurred_at < b.ends_at),0)) end as amount
    from public.saas_invoices i cross join bounds b
    where i.currency = target_currency and i.issued_at < b.ends_at and i.status in ('open','paid','past_due')
  ), entries as (
    select c.id,c.tenant_id,c.invoice_id,'Pago confirmado'::text as label,c.occurred_at as event_at,c.amount
    from public.saas_charges c cross join bounds b
    where target_metric = 'collected' and c.currency = target_currency and c.status in ('succeeded','refunded')
      and c.occurred_at >= b.starts_at and c.occurred_at < b.ends_at
    union all
    select r.id,r.tenant_id,c.invoice_id,'Reembolso confirmado',r.processed_at,-r.amount
    from public.saas_refunds r join public.saas_charges c on c.id = r.charge_id and c.tenant_id = r.tenant_id cross join bounds b
    where target_metric = 'collected' and r.currency = target_currency and r.status = 'succeeded'
      and r.processed_at >= b.starts_at and r.processed_at < b.ends_at
      and exists(select 1 from public.saas_charges historical where historical.currency = target_currency)
    union all
    select i.id,i.tenant_id,i.id,i.invoice_number,i.due_on::timestamp at time zone 'UTC',i.amount
    from balances i cross join bounds b where i.amount > 0 and
      ((target_metric = 'pending' and (i.due_on > b.ends_on or i.due_on is null))
        or (target_metric = 'past_due' and i.due_on <= b.ends_on))
    union all
    select s.id,s.tenant_id,null::uuid,'MRR contratado al cierre',b.ends_at,
      case when e.duration_unit = 'days' then e.price*365/(12::numeric*e.duration_count)
        when e.duration_unit = 'months' then e.price/e.duration_count
        else e.price / case e.billing_cycle when 'monthly' then 1 when 'quarterly' then 3 when 'semiannual' then 6 when 'annual' then 12 end end
    from public.saas_subscriptions s cross join bounds b join lateral (
      select event.* from public.saas_subscription_events event
      where event.subscription_id = s.id and event.effective_on <= b.ends_on
      order by event.effective_on desc,event.occurred_at desc,event.event_order desc limit 1
    ) e on true
    where target_metric = 'mrr' and e.currency = target_currency and s.starts_on <= b.ends_on
      and (s.ended_on is null or s.ended_on > b.ends_on) and e.new_status in ('trial','active','past_due')
  ), page as (
    select e.*,t.name as tenant_name from entries e join public.tenants t on t.id = e.tenant_id
    order by event_at desc nulls last,id limit 20 offset (page_number-1)*20
  )
  select jsonb_build_object('period',target_period,'currency',target_currency,'metric',target_metric,'page',page_number,
    'total',(select count(*) from entries),'amount',round(coalesce((select sum(amount) from entries),0),2),
    'entries',coalesce((select jsonb_agg(to_jsonb(p) order by event_at desc nulls last,id) from page p),'[]'::jsonb))
  into result;
  perform public.record_saas_privileged_operation(null,'saas.financial_ledger_read','Consultar detalle financiero','succeeded',
    jsonb_build_object('period',target_period,'currency',target_currency,'metric',target_metric,'page',page_number));
  return result;
end;
$$;
revoke all on function public.get_saas_financial_ledger(date,text,text,integer) from public,anon;
grant execute on function public.get_saas_financial_ledger(date,text,text,integer) to authenticated;
commit;
