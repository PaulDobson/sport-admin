-- Stage 6: date-effective SaaS resource limits and feature entitlements.
-- Run after 0016_saas_payment_webhooks.sql.

alter table public.saas_plans drop constraint if exists saas_plans_features_catalog_check;
alter table public.saas_plans
  add constraint saas_plans_features_catalog_check check (
    features <@ '["reports", "offline", "realtime"]'::jsonb
  );

alter table public.saas_limits drop constraint if exists saas_limits_features_catalog_check;
alter table public.saas_limits
  add constraint saas_limits_features_catalog_check check (
    features <@ '["reports", "offline", "realtime"]'::jsonb
  );

alter table public.saas_limits
  add column if not exists plan_id uuid references public.saas_plans(id) on delete restrict;
update public.saas_limits limits
set plan_id = subscription.plan_id
from public.saas_subscriptions subscription
where subscription.tenant_id = limits.tenant_id
  and subscription.id = limits.subscription_id
  and limits.plan_id is null;
alter table public.saas_limits alter column plan_id set not null;

create or replace function public.fill_saas_limit_plan_id()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.plan_id is null then
    select subscription.plan_id into new.plan_id
    from public.saas_subscriptions subscription
    where subscription.tenant_id = new.tenant_id
      and subscription.id = new.subscription_id;
    if new.plan_id is null then
      raise exception 'Cannot derive plan from SaaS subscription' using errcode = 'P0002';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fill_saas_limit_plan_id on public.saas_limits;
create trigger fill_saas_limit_plan_id
  before insert on public.saas_limits
  for each row execute function public.fill_saas_limit_plan_id();

alter table public.saas_limits
  drop constraint if exists saas_limits_tenant_id_subscription_id_key;
create index if not exists saas_limits_tenant_subscription_date_idx
  on public.saas_limits (tenant_id, subscription_id, effective_from desc);
create unique index if not exists saas_limits_tenant_subscription_start_idx
  on public.saas_limits (tenant_id, subscription_id, effective_from);
create unique index if not exists saas_limits_one_open_snapshot_idx
  on public.saas_limits (tenant_id, subscription_id)
  where effective_until is null;

create or replace function public.current_saas_limits(
  target_tenant uuid,
  effective_on date default current_date
)
returns table (
  plan_id uuid,
  max_students integer,
  max_users integer,
  features jsonb,
  subscription_status text
)
language sql stable security definer set search_path = public
as $$
  select limits.plan_id, limits.max_students, limits.max_users, limits.features, subscription.status
  from public.saas_limits limits
  join public.saas_subscriptions subscription
    on subscription.tenant_id = limits.tenant_id
    and subscription.id = limits.subscription_id
  where limits.tenant_id = target_tenant
    and limits.effective_from <= effective_on
    and (limits.effective_until is null or limits.effective_until >= effective_on)
    and subscription.status in ('trial', 'active', 'past_due', 'suspended')
  order by limits.effective_from desc, limits.created_at desc
  limit 1;
$$;

create or replace function public.schedule_saas_plan_limits(
  target_tenant uuid,
  target_subscription uuid,
  target_plan uuid,
  target_effective_from date,
  change_reason text
)
returns public.saas_limits
language plpgsql security definer set search_path = public
as $$
declare
  selected_plan public.saas_plans;
  selected_subscription public.saas_subscriptions;
  previous_limits public.saas_limits;
  created_limits public.saas_limits;
  normalized_reason text := trim(change_reason);
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_effective_from < current_date then
    raise exception 'Plan limits cannot start in the past' using errcode = '22023';
  end if;
  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception 'A plan change reason of at least 3 characters is required' using errcode = '22023';
  end if;

  select * into selected_subscription
  from public.saas_subscriptions subscription
  where subscription.tenant_id = target_tenant
    and subscription.id = target_subscription
    and subscription.status in ('trial', 'active', 'past_due', 'suspended')
  for update;
  if not found then
    raise exception 'Current SaaS subscription not found' using errcode = 'P0002';
  end if;

  select * into selected_plan
  from public.saas_plans plan
  where plan.id = target_plan and plan.status = 'active';
  if not found then
    raise exception 'Active SaaS plan not found' using errcode = 'P0002';
  end if;

  select * into previous_limits
  from public.saas_limits limits
  where limits.tenant_id = target_tenant
    and limits.subscription_id = target_subscription
  order by limits.effective_from desc, limits.created_at desc
  limit 1
  for update;
  if found and target_effective_from <= previous_limits.effective_from then
    raise exception 'Plan limits must start after the latest snapshot' using errcode = '22023';
  end if;
  if found then
    update public.saas_limits
    set effective_until = target_effective_from - 1
    where id = previous_limits.id;
  end if;

  insert into public.saas_limits (
    tenant_id, subscription_id, plan_id, max_students, max_users, features, effective_from
  ) values (
    target_tenant, target_subscription, target_plan, selected_plan.max_students,
    selected_plan.max_users, selected_plan.features, target_effective_from
  ) returning * into created_limits;

  insert into public.audit_log (
    tenant_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_tenant, auth.uid(), 'saas.plan_limits_scheduled', 'saas_limits',
    created_limits.id::text,
    jsonb_build_object(
      'plan_id', target_plan,
      'effective_from', target_effective_from,
      'reason', normalized_reason,
      'previous_limits_id', previous_limits.id
    )
  );

  return created_limits;
end;
$$;

create or replace function public.can_use_saas_feature(
  target_tenant uuid,
  target_feature text,
  effective_on date default current_date
)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  limits record;
begin
  if target_feature not in ('reports', 'offline', 'realtime') then
    return false;
  end if;
  if not (
    public.is_platform_admin()
    or target_tenant = any (public.current_tenant_ids())
  ) then
    return false;
  end if;

  select * into limits from public.current_saas_limits(target_tenant, effective_on);
  -- past_due keeps features during the collection grace period; suspended does not.
  return found
    and limits.subscription_status in ('trial', 'active', 'past_due')
    and limits.features ? target_feature;
end;
$$;

create or replace function public.list_active_saas_plans()
returns table (
  id uuid,
  name text,
  max_students integer,
  max_users integer,
  features jsonb
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  return query
  select plan.id, plan.name, plan.max_students, plan.max_users, plan.features
  from public.saas_plans plan
  where plan.status = 'active'
  order by plan.price, plan.name;
end;
$$;

create or replace function public.get_saas_tenant_entitlements(target_tenant uuid)
returns table (
  subscription_id uuid,
  plan_id uuid,
  active_students bigint,
  active_users bigint,
  max_students integer,
  max_users integer,
  features jsonb
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  return query
  select subscription.id, limits.plan_id,
    (select count(*) from public.students student
      where student.tenant_id = target_tenant and student.status = 'active'),
    (select count(*) from public.tenant_memberships membership
      where membership.tenant_id = target_tenant and membership.status = 'active'),
    limits.max_students, limits.max_users, limits.features
  from public.saas_subscriptions subscription
  join public.current_saas_limits(target_tenant, current_date) limits on true
  where subscription.tenant_id = target_tenant
    and subscription.status in ('trial', 'active', 'past_due', 'suspended')
  limit 1;
end;
$$;

create or replace function public.enforce_saas_resource_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  limits record;
  current_usage integer;
  resource_name text;
  allowed_usage integer;
begin
  if tg_table_name = 'students' then
    if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
      return new;
    end if;
    resource_name := 'student';
  else
    if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
      return new;
    end if;
    resource_name := 'user';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('saas-limit:' || new.tenant_id::text || ':' || resource_name, 0)
  );
  select * into limits from public.current_saas_limits(new.tenant_id, current_date);
  if not found then
    return new;
  end if;

  if resource_name = 'student' then
    allowed_usage := limits.max_students;
    select count(*) into current_usage
    from public.students student
    where student.tenant_id = new.tenant_id and student.status = 'active';
  else
    allowed_usage := limits.max_users;
    select count(*) into current_usage
    from public.tenant_memberships membership
    where membership.tenant_id = new.tenant_id and membership.status = 'active';
  end if;

  if current_usage >= allowed_usage then
    raise exception 'SaaS % limit reached (%/%). Upgrade the plan or deactivate an active %.',
      resource_name, current_usage, allowed_usage, resource_name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_saas_student_limit on public.students;
create trigger enforce_saas_student_limit
  before insert or update of status on public.students
  for each row execute function public.enforce_saas_resource_limit();

drop trigger if exists enforce_saas_user_limit on public.tenant_memberships;
create trigger enforce_saas_user_limit
  before insert or update of status on public.tenant_memberships
  for each row execute function public.enforce_saas_resource_limit();

revoke all on function public.current_saas_limits(uuid, date) from public;
revoke all on function public.can_use_saas_feature(uuid, text, date) from public;
revoke all on function public.list_active_saas_plans() from public;
revoke all on function public.get_saas_tenant_entitlements(uuid) from public;
revoke all on function public.schedule_saas_plan_limits(uuid, uuid, uuid, date, text) from public;
grant execute on function public.current_saas_limits(uuid, date) to authenticated;
grant execute on function public.can_use_saas_feature(uuid, text, date) to authenticated;
grant execute on function public.list_active_saas_plans() to authenticated;
grant execute on function public.get_saas_tenant_entitlements(uuid) to authenticated;
grant execute on function public.schedule_saas_plan_limits(uuid, uuid, uuid, date, text) to authenticated;