-- Stage 6: reproducible monthly SaaS financial indicators, separated by currency.
-- Run after 0017_saas_plan_limits.sql.

alter table public.saas_subscriptions
  add column if not exists converted_at date;

alter table public.saas_subscriptions
  add constraint saas_subscriptions_conversion_date_check check (
    converted_at is null or converted_at >= starts_on
  );

create table if not exists public.saas_subscription_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null references public.saas_subscriptions(id) on delete restrict,
  previous_status text check (
    previous_status is null or previous_status in (
      'trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired'
    )
  ),
  new_status text not null check (
    new_status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')
  ),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_cycle text not null check (
    billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')
  ),
  effective_on date not null,
  occurred_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, subscription_id)
    references public.saas_subscriptions(tenant_id, id) on delete restrict
);

create index if not exists saas_subscription_events_status_date_idx
  on public.saas_subscription_events (
    subscription_id, effective_on desc, occurred_at desc
  );

alter table public.saas_subscription_events enable row level security;

create or replace function public.set_saas_subscription_conversion_date()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if old.status = 'trial' and new.status = 'active' and new.converted_at is null then
    new.converted_at := (now() at time zone 'UTC')::date;
  end if;
  return new;
end;
$$;

create or replace function public.record_saas_subscription_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  event_effective_on date;
begin
  if tg_op = 'UPDATE'
    and old.status = new.status
    and old.price = new.price
    and old.currency = new.currency
    and old.billing_cycle = new.billing_cycle then
    return new;
  end if;

  event_effective_on := case
    when new.status in ('cancelled', 'expired')
      then coalesce(new.ended_on, (now() at time zone 'UTC')::date)
    when tg_op = 'UPDATE' and old.status = 'trial' and new.status = 'active'
      then coalesce(new.converted_at, (now() at time zone 'UTC')::date)
    when tg_op = 'INSERT' then new.starts_on
    else (now() at time zone 'UTC')::date
  end;
  insert into public.saas_subscription_events (
    tenant_id, subscription_id, previous_status, new_status,
    price, currency, billing_cycle, effective_on
  ) values (
    new.tenant_id, new.id,
    case when tg_op = 'UPDATE' then old.status end,
    new.status, new.price, new.currency, new.billing_cycle, event_effective_on
  );
  return new;
end;
$$;

drop trigger if exists set_saas_subscription_conversion_date
  on public.saas_subscriptions;
create trigger set_saas_subscription_conversion_date
  before update of status on public.saas_subscriptions
  for each row execute function public.set_saas_subscription_conversion_date();

drop trigger if exists record_saas_subscription_status
  on public.saas_subscriptions;
create trigger record_saas_subscription_status
  after insert or update of status, price, currency, billing_cycle
  on public.saas_subscriptions
  for each row execute function public.record_saas_subscription_status();

insert into public.saas_subscription_events (
  tenant_id, subscription_id, previous_status, new_status,
  price, currency, billing_cycle, effective_on, occurred_at
)
select subscription.tenant_id, subscription.id, null, subscription.status,
  subscription.price, subscription.currency, subscription.billing_cycle,
  case when subscription.status in ('cancelled', 'expired')
    then subscription.ended_on else subscription.starts_on end,
  subscription.created_at
from public.saas_subscriptions subscription
where not exists (
  select 1 from public.saas_subscription_events event
  where event.subscription_id = subscription.id
);

revoke all on function public.set_saas_subscription_conversion_date() from public;
revoke all on function public.record_saas_subscription_status() from public;

create index if not exists saas_subscriptions_dashboard_dates_idx
  on public.saas_subscriptions (
    currency, starts_on, ended_on, trial_ends_on, converted_at
  );

create or replace function public.get_saas_financial_dashboard(target_period date)
returns table (
  currency text,
  mrr numeric,
  arr numeric,
  arpa numeric,
  recurring_tenants bigint,
  churned_tenants bigint,
  churn_rate numeric,
  trials_ended bigint,
  trials_converted bigint,
  trial_conversion_rate numeric,
  collected_net numeric,
  pending_amount numeric,
  past_due_amount numeric,
  past_due_tenants bigint
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
  ),
  currencies as (
    select subscription.currency from public.saas_subscriptions subscription
    union select invoice.currency from public.saas_invoices invoice
    union select charge.currency from public.saas_charges charge
    union select refund.currency from public.saas_refunds refund
  ),
  status_at_end as (
    select subscription.id, subscription.tenant_id, subscription.starts_on,
      subscription.ended_on, status_event.new_status as status_at_end,
      status_event.price, status_event.currency, status_event.billing_cycle
    from public.saas_subscriptions subscription cross join bounds
    join lateral (
      select event.new_status, event.price, event.currency, event.billing_cycle
      from public.saas_subscription_events event
      where event.subscription_id = subscription.id
        and event.effective_on <= bounds.ends_on
      order by event.effective_on desc, event.occurred_at desc
      limit 1
    ) status_event on true
  ),
  recurring as (
    select subscription.currency,
      sum(subscription.price / case subscription.billing_cycle
        when 'monthly' then 1
        when 'quarterly' then 3
        when 'semiannual' then 6
        when 'annual' then 12
      end)::numeric as mrr,
      count(distinct subscription.tenant_id)::bigint as tenants
    from status_at_end subscription cross join bounds
    where subscription.starts_on <= bounds.ends_on
      and (subscription.ended_on is null or subscription.ended_on > bounds.ends_on)
      and subscription.status_at_end in ('trial', 'active', 'past_due')
    group by subscription.currency
  ),
  status_at_start as (
    select subscription.id, subscription.tenant_id, status_event.currency,
      status_event.new_status as status_at_start
    from public.saas_subscriptions subscription cross join bounds
    join lateral (
      select event.new_status, event.currency
      from public.saas_subscription_events event
      where event.subscription_id = subscription.id
        and event.effective_on < bounds.starts_on
      order by event.effective_on desc, event.occurred_at desc
      limit 1
    ) status_event on true
  ),
  churn as (
    select opening.currency,
      count(distinct cancelled.tenant_id)::bigint as churned,
      count(distinct opening.tenant_id)::bigint as opening_tenants
    from status_at_start opening cross join bounds
    left join public.saas_subscription_events cancelled
      on cancelled.subscription_id = opening.id
      and cancelled.new_status = 'cancelled'
      and cancelled.effective_on between bounds.starts_on and bounds.ends_on
    where opening.status_at_start in ('trial', 'active', 'past_due')
    group by opening.currency
  ),
  trials as (
    select subscription.currency,
      count(distinct subscription.id)::bigint as ended,
      count(distinct subscription.id) filter (where conversion.id is not null)::bigint
        as converted
    from public.saas_subscriptions subscription cross join bounds
    left join public.saas_subscription_events conversion
      on conversion.subscription_id = subscription.id
      and conversion.previous_status = 'trial'
      and conversion.new_status = 'active'
      and conversion.effective_on <= bounds.ends_on
    where subscription.trial_ends_on between bounds.starts_on and bounds.ends_on
    group by subscription.currency
  ),
  collections as (
    select charge.currency,
      coalesce(sum(charge.amount) filter (
        where charge.status in ('succeeded', 'refunded')
          and charge.occurred_at >= bounds.starts_at
          and charge.occurred_at < bounds.ends_at
      ), 0)::numeric
      - coalesce((
        select sum(refund.amount)
        from public.saas_refunds refund
        where refund.currency = charge.currency
          and refund.status = 'succeeded'
          and refund.processed_at >= bounds.starts_at
          and refund.processed_at < bounds.ends_at
      ), 0)::numeric as net
    from public.saas_charges charge cross join bounds
    group by charge.currency, bounds.starts_at, bounds.ends_at
  ),
  receivables as (
    select invoice.currency,
      coalesce(sum(invoice.amount) filter (
        where invoice.issued_at < bounds.ends_at
          and (invoice.paid_at is null or invoice.paid_at >= bounds.ends_at)
          and invoice.due_on > bounds.ends_on
          and invoice.status in ('open', 'paid', 'past_due')
      ), 0)::numeric as pending,
      coalesce(sum(invoice.amount) filter (
        where invoice.issued_at < bounds.ends_at
          and (invoice.paid_at is null or invoice.paid_at >= bounds.ends_at)
          and invoice.due_on <= bounds.ends_on
          and invoice.status in ('open', 'paid', 'past_due')
      ), 0)::numeric as past_due,
      count(distinct invoice.tenant_id) filter (
        where invoice.issued_at < bounds.ends_at
          and (invoice.paid_at is null or invoice.paid_at >= bounds.ends_at)
          and invoice.due_on <= bounds.ends_on
          and invoice.status in ('open', 'paid', 'past_due')
      )::bigint as past_due_tenants
    from public.saas_invoices invoice cross join bounds
    group by invoice.currency
  )
  select currencies.currency,
    round(coalesce(recurring.mrr, 0), 2),
    round(coalesce(recurring.mrr, 0) * 12, 2),
    round(case when coalesce(recurring.tenants, 0) = 0 then 0
      else recurring.mrr / recurring.tenants end, 2),
    coalesce(recurring.tenants, 0),
    coalesce(churn.churned, 0),
    round(case when coalesce(churn.opening_tenants, 0) = 0 then 0
      else churn.churned::numeric * 100 / churn.opening_tenants end, 2),
    coalesce(trials.ended, 0),
    coalesce(trials.converted, 0),
    round(case when coalesce(trials.ended, 0) = 0 then 0
      else trials.converted::numeric * 100 / trials.ended end, 2),
    round(coalesce(collections.net, 0), 2),
    round(coalesce(receivables.pending, 0), 2),
    round(coalesce(receivables.past_due, 0), 2),
    coalesce(receivables.past_due_tenants, 0)
  from currencies
  left join recurring using (currency)
  left join churn using (currency)
  left join trials using (currency)
  left join collections using (currency)
  left join receivables using (currency)
  order by currencies.currency;
end;
$$;

revoke all on function public.get_saas_financial_dashboard(date) from public;
grant execute on function public.get_saas_financial_dashboard(date) to authenticated;