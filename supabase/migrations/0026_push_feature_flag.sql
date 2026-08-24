-- Stage 8: phase-three push entitlement with internal activity fallback.

alter table public.saas_plans
  drop constraint if exists saas_plans_features_catalog_check;
alter table public.saas_plans
  add constraint saas_plans_features_catalog_check check (
    features <@ '["reports", "offline", "realtime", "push"]'::jsonb
  );

alter table public.saas_limits
  drop constraint if exists saas_limits_features_catalog_check;
alter table public.saas_limits
  add constraint saas_limits_features_catalog_check check (
    features <@ '["reports", "offline", "realtime", "push"]'::jsonb
  );

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
  if target_feature not in ('reports', 'offline', 'realtime', 'push') then
    return false;
  end if;
  if not (
    public.is_platform_admin()
    or target_tenant = any (public.current_tenant_ids())
  ) then
    return false;
  end if;

  select * into limits from public.current_saas_limits(target_tenant, effective_on);
  return found
    and limits.subscription_status in ('trial', 'active', 'past_due')
    and limits.features ? target_feature;
end;
$$;

create or replace function public.enforce_push_delivery_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  push_enabled boolean;
begin
  if new.channel <> 'push' then
    return new;
  end if;

  select exists (
    select 1
    from public.current_saas_limits(new.tenant_id, current_date) limits
    where limits.subscription_status in ('trial', 'active', 'past_due')
      and limits.features ? 'push'
  ) into push_enabled;

  if not push_enabled then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_push_delivery_entitlement() from public;

drop trigger if exists enforce_push_delivery_entitlement
  on public.notification_deliveries;
create trigger enforce_push_delivery_entitlement
  before insert on public.notification_deliveries
  for each row execute function public.enforce_push_delivery_entitlement();
