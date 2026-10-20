-- Preserve the audited wrapper and historical currency/event boundaries.
begin;

create or replace function public.get_saas_financial_dashboard_unlogged(target_period date)
returns table (
  currency text, mrr numeric, arr numeric, arpa numeric, recurring_tenants bigint,
  churned_tenants bigint, churn_rate numeric, trials_ended bigint,
  trials_converted bigint, trial_conversion_rate numeric, collected_net numeric,
  pending_amount numeric, past_due_amount numeric, past_due_tenants bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_period is null or target_period <> date_trunc('month', target_period)::date then
    raise exception 'Dashboard period must be the first day of a month' using errcode = '22023';
  end if;
  return query
  with bounds as (
    select target_period as starts_on,
      (target_period + interval '1 month - 1 day')::date as ends_on,
      target_period::timestamp at time zone 'UTC' as starts_at,
      (target_period + interval '1 month')::timestamp at time zone 'UTC' as ends_at
  ), currencies as (
    select s.currency from public.saas_subscriptions s
    union select i.currency from public.saas_invoices i
    union select c.currency from public.saas_charges c
    union select r.currency from public.saas_refunds r
  ), status_at_end as (
    select s.id, s.tenant_id, s.starts_on, s.ended_on, e.new_status,
      e.price, e.currency, e.billing_cycle, e.duration_unit, e.duration_count
    from public.saas_subscriptions s cross join bounds b
    join lateral (
      select event.new_status, event.price, event.currency, event.billing_cycle,
        event.duration_unit, event.duration_count
      from public.saas_subscription_events event
      where event.subscription_id = s.id and event.effective_on <= b.ends_on
      order by event.effective_on desc, event.occurred_at desc, event.event_order desc limit 1
    ) e on true
  ), recurring as (
    select s.currency,
      sum(case
        when s.duration_unit = 'days' then s.price * 365 / (12::numeric * s.duration_count)
        when s.duration_unit = 'months' then s.price / s.duration_count
        else s.price / case s.billing_cycle when 'monthly' then 1 when 'quarterly' then 3
          when 'semiannual' then 6 when 'annual' then 12 end
      end)::numeric as mrr,
      count(distinct s.tenant_id)::bigint as tenants
    from status_at_end s cross join bounds b
    where s.starts_on <= b.ends_on and (s.ended_on is null or s.ended_on > b.ends_on)
      and s.new_status in ('trial', 'active', 'past_due')
    group by s.currency
  ), status_at_start as (
    select s.id, s.tenant_id, e.currency, e.new_status
    from public.saas_subscriptions s cross join bounds b
    join lateral (
      select event.new_status, event.currency from public.saas_subscription_events event
      where event.subscription_id = s.id and event.effective_on < b.starts_on
      order by event.effective_on desc, event.occurred_at desc, event.event_order desc limit 1
    ) e on true
  ), churn as (
    select opening.currency, count(distinct cancelled.tenant_id)::bigint as churned,
      count(distinct opening.tenant_id)::bigint as opening_tenants
    from status_at_start opening cross join bounds b
    left join public.saas_subscription_events cancelled
      on cancelled.subscription_id = opening.id and cancelled.new_status = 'cancelled'
      and cancelled.effective_on between b.starts_on and b.ends_on
    where opening.new_status in ('trial', 'active', 'past_due')
    group by opening.currency
  ), trials as (
    select s.currency, count(distinct s.id)::bigint as ended,
      count(distinct s.id) filter (where conversion.id is not null)::bigint as converted
    from public.saas_subscriptions s cross join bounds b
    left join public.saas_subscription_events conversion
      on conversion.subscription_id = s.id and conversion.previous_status = 'trial'
      and conversion.new_status = 'active' and conversion.effective_on <= b.ends_on
    where s.trial_ends_on between b.starts_on and b.ends_on
    group by s.currency
  ), collections as (
    select c.currency,
      coalesce(sum(c.amount) filter (
        where c.status in ('succeeded', 'refunded') and c.occurred_at >= b.starts_at and c.occurred_at < b.ends_at
      ), 0)::numeric - coalesce((
        select sum(r.amount) from public.saas_refunds r
        where r.currency = c.currency and r.status = 'succeeded'
          and r.processed_at >= b.starts_at and r.processed_at < b.ends_at
      ), 0)::numeric as net
    from public.saas_charges c cross join bounds b
    group by c.currency, b.starts_at, b.ends_at
  ), invoice_balances as (
    select i.id, i.tenant_id, i.currency, i.due_on,
      -- Imported legacy settlements may have paid_at but no charge ledger.
      case when i.invoice_kind = 'legacy' and i.status = 'paid' and i.paid_at < b.ends_at
        and not exists (select 1 from public.saas_charges historical_charge
          where historical_charge.invoice_id = i.id and historical_charge.tenant_id = i.tenant_id
            and historical_charge.status in ('succeeded', 'refunded'))
        then 0 else greatest(0, i.amount - coalesce((
        select sum(c.amount) from public.saas_charges c
        where c.tenant_id = i.tenant_id and c.invoice_id = i.id
          and c.currency = i.currency and c.status in ('succeeded', 'refunded')
          and c.occurred_at < b.ends_at
      ), 0)) end::numeric as balance
    from public.saas_invoices i cross join bounds b
    where i.issued_at < b.ends_at and i.status in ('open', 'paid', 'past_due')
  ), receivables as (
    select i.currency,
      coalesce(sum(i.balance) filter (where i.due_on > b.ends_on or i.due_on is null), 0)::numeric as pending,
      coalesce(sum(i.balance) filter (where i.due_on <= b.ends_on), 0)::numeric as past_due,
      count(distinct i.tenant_id) filter (where i.balance > 0 and i.due_on <= b.ends_on)::bigint as past_due_tenants
    from invoice_balances i cross join bounds b group by i.currency
  )
  select currencies.currency,
    round(coalesce(recurring.mrr, 0), 2), round(coalesce(recurring.mrr, 0) * 12, 2),
    round(case when coalesce(recurring.tenants, 0) = 0 then 0 else recurring.mrr / recurring.tenants end, 2),
    coalesce(recurring.tenants, 0), coalesce(churn.churned, 0),
    round(case when coalesce(churn.opening_tenants, 0) = 0 then 0
      else churn.churned::numeric * 100 / churn.opening_tenants end, 2),
    coalesce(trials.ended, 0), coalesce(trials.converted, 0),
    round(case when coalesce(trials.ended, 0) = 0 then 0 else trials.converted::numeric * 100 / trials.ended end, 2),
    round(coalesce(collections.net, 0), 2), round(coalesce(receivables.pending, 0), 2),
    round(coalesce(receivables.past_due, 0), 2), coalesce(receivables.past_due_tenants, 0)
  from currencies
  left join recurring using (currency) left join churn using (currency)
  left join trials using (currency) left join collections using (currency)
  left join receivables using (currency) order by currencies.currency;
end;
$$;

revoke all on function public.get_saas_financial_dashboard_unlogged(date) from public, anon, authenticated;
commit;
