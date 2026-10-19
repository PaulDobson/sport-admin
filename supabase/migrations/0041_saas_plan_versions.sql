-- Additive commercial model. Legacy dates, amounts and currencies are not rewritten.
begin;

create table public.saas_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  name text not null check (length(btrim(name)) > 0),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  duration_unit text not null check (duration_unit in ('days', 'months')),
  duration_count integer not null check (duration_count > 0),
  trial_days integer not null check (trial_days between 0 and 365),
  max_students integer not null check (max_students > 0),
  max_users integer not null check (max_users > 0),
  features jsonb not null check (
    jsonb_typeof(features) = 'array'
    and features <@ '["reports","offline","realtime","push"]'::jsonb
  ),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  legacy boolean not null default false,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (plan_id, id),
  unique (plan_id, version_number),
  check (legacy or (currency = 'CLP' and price = trunc(price)))
);

alter table public.saas_plans
  add column current_version_id uuid,
  add column commercially_managed boolean not null default false;
alter table public.saas_plans
  add constraint saas_plans_current_version_fkey
  foreign key (id, current_version_id)
  references public.saas_plan_versions(plan_id, id) on delete restrict;
alter table public.saas_plans drop constraint saas_plans_billing_cycle_check;
alter table public.saas_plans add constraint saas_plans_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'custom'));

insert into public.saas_plan_versions (
  plan_id, version_number, name, description, price, currency,
  duration_unit, duration_count, trial_days, max_students, max_users, features, legacy
)
select id, 1, name, description, price, currency, 'months',
  case billing_cycle when 'monthly' then 1 when 'quarterly' then 3
    when 'semiannual' then 6 when 'annual' then 12 end,
  trial_days, max_students, max_users, features, true
from public.saas_plans;

update public.saas_plans p set current_version_id = v.id
from public.saas_plan_versions v where v.plan_id = p.id and v.version_number = 1;

alter table public.saas_subscriptions
  add column plan_version_id uuid,
  add column contract_snapshot jsonb,
  add column duration_unit text check (duration_unit in ('days', 'months')),
  add column duration_count integer check (duration_count > 0),
  add column period_anchor_on date,
  add column current_period_end_exclusive date,
  add column applied_rate_numerator numeric,
  add column applied_rate_denominator numeric,
  add constraint saas_subscriptions_version_fkey
    foreign key (plan_id, plan_version_id)
    references public.saas_plan_versions(plan_id, id) on delete restrict,
  add constraint saas_subscriptions_rate_check check (
    (applied_rate_numerator is null and applied_rate_denominator is null)
    or (applied_rate_numerator is not null and applied_rate_denominator is not null
      and applied_rate_numerator >= 0 and applied_rate_numerator = trunc(applied_rate_numerator)
      and applied_rate_denominator > 0 and applied_rate_denominator = trunc(applied_rate_denominator))
  ),
  add constraint saas_subscriptions_snapshot_check check (
    contract_snapshot is null or jsonb_typeof(contract_snapshot) = 'object'
  ),
  add constraint saas_subscriptions_exclusive_period_check check (
    current_period_end_exclusive is null
    or current_period_end_exclusive > current_period_starts_on
  );

-- A legacy subscription may have negotiated terms different from today's catalog.
do $$
declare
  s record;
  selected_version uuid;
  months integer;
begin
  for s in
    select subscription.*, p.name as plan_name, p.description as plan_description,
      p.trial_days as plan_trial_days,
      coalesce(l.max_students, p.max_students) as limit_students,
      coalesce(l.max_users, p.max_users) as limit_users,
      coalesce(l.features, p.features) as limit_features
    from public.saas_subscriptions subscription
    join public.saas_plans p on p.id = subscription.plan_id
    left join lateral (
      select limits.max_students, limits.max_users, limits.features
      from public.saas_limits limits
      where limits.subscription_id = subscription.id
        and limits.effective_from <= subscription.current_period_starts_on
        and (limits.effective_until is null
          or limits.effective_until >= subscription.current_period_starts_on)
      order by limits.effective_from desc, limits.created_at desc limit 1
    ) l on true
    order by subscription.id
  loop
    months := case s.billing_cycle when 'monthly' then 1 when 'quarterly' then 3
      when 'semiannual' then 6 when 'annual' then 12 end;
    select v.id into selected_version from public.saas_plan_versions v
    where v.plan_id = s.plan_id and v.price = s.price and v.currency = s.currency
      and v.duration_unit = 'months' and v.duration_count = months
      and v.max_students = s.limit_students and v.max_users = s.limit_users
      and v.features = s.limit_features
    order by v.version_number limit 1;
    if selected_version is null then
      insert into public.saas_plan_versions (
        plan_id, version_number, name, description, price, currency,
        duration_unit, duration_count, trial_days, max_students, max_users, features, legacy
      )
      select s.plan_id, max(v.version_number) + 1, s.plan_name, s.plan_description,
        s.price, s.currency, 'months', months, s.plan_trial_days,
        s.limit_students, s.limit_users, s.limit_features, true
      from public.saas_plan_versions v where v.plan_id = s.plan_id
      returning id into selected_version;
    end if;
    update public.saas_subscriptions set
      plan_version_id = selected_version,
      contract_snapshot = (
        select to_jsonb(v) - 'created_by' - 'created_at'
        from public.saas_plan_versions v where v.id = selected_version
      ),
      duration_unit = 'months', duration_count = months,
      period_anchor_on = coalesce(s.trial_ends_on + 1, s.starts_on),
      current_period_end_exclusive = s.current_period_ends_on + 1,
      applied_rate_numerator = s.price * 100,
      applied_rate_denominator = (s.current_period_ends_on - s.current_period_starts_on + 1) * 100
    where id = s.id;
  end loop;
end;
$$;

alter table public.saas_invoices
  add column plan_version_id uuid references public.saas_plan_versions(id) on delete restrict,
  add column invoice_kind text not null default 'legacy'
    check (invoice_kind in ('legacy', 'initial', 'renewal', 'upgrade')),
  add column contract_snapshot jsonb check (
    contract_snapshot is null or jsonb_typeof(contract_snapshot) = 'object'
  ),
  add column line_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(line_items) = 'array'),
  add column period_end_exclusive date,
  add constraint saas_invoices_exclusive_period_check check (
    period_end_exclusive is null or period_end_exclusive > period_starts_on
  );
update public.saas_invoices set
  period_end_exclusive = period_ends_on + 1,
  contract_snapshot = jsonb_build_object(
    'origin', 'legacy_invoice', 'amount', amount, 'currency', currency,
    'periodStartsOn', period_starts_on, 'periodEndExclusive', period_ends_on + 1
  );
create unique index saas_invoices_commercial_period_idx
  on public.saas_invoices (subscription_id, period_starts_on)
  where invoice_kind in ('initial', 'renewal');

alter table public.saas_subscription_events
  add column plan_version_id uuid references public.saas_plan_versions(id) on delete restrict,
  add column duration_unit text check (duration_unit in ('days', 'months')),
  add column duration_count integer check (duration_count > 0);
-- Historical events retain their own cycle, never the current contract's price/duration.
update public.saas_subscription_events set duration_unit = 'months',
  duration_count = case billing_cycle when 'monthly' then 1 when 'quarterly' then 3
    when 'semiannual' then 6 when 'annual' then 12 end;

create function public.reject_saas_snapshot_mutation()
returns trigger language plpgsql set search_path = public
as $$
begin
  raise exception 'Commercial snapshots are immutable' using errcode = '55000';
end;
$$;
create trigger saas_plan_versions_immutable
  before update or delete on public.saas_plan_versions
  for each row execute function public.reject_saas_snapshot_mutation();

alter table public.saas_plan_versions enable row level security;
revoke all on public.saas_plan_versions from public, anon, authenticated;
revoke all on function public.reject_saas_snapshot_mutation() from public;

-- Do not expose new commercial terms through the old limits-only write path.
create function public.guard_saas_commercial_limit_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (exists (
    select 1 from public.saas_plans p
    where p.id = new.plan_id and p.commercially_managed
  ) or exists (
    select 1 from public.saas_subscriptions s
    join public.saas_plans p on p.id = s.plan_id
    where s.id = new.subscription_id and p.commercially_managed
  )) and not exists (
    select 1 from public.saas_subscriptions s
    join public.saas_plan_versions v on v.id = s.plan_version_id
    where s.id = new.subscription_id and s.tenant_id = new.tenant_id
      and s.plan_id = new.plan_id
      and new.max_students = v.max_students and new.max_users = v.max_users
      and new.features = v.features
  ) then
    raise exception 'Commercial plan changes require a confirmed financial preview' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger guard_saas_commercial_limit_change
  before insert or update on public.saas_limits
  for each row execute function public.guard_saas_commercial_limit_change();
revoke all on function public.guard_saas_commercial_limit_change() from public;

commit;
