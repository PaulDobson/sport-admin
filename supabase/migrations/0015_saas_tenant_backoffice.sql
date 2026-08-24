-- Stage 6: platform tenant backoffice with atomic, auditable status transitions.
-- Run after 0014_saas_billing_foundation.sql.

create or replace function public.list_saas_tenants()
returns table (
  id uuid,
  name text,
  status text,
  billing_contact_name text,
  billing_contact_email text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select tenant.id, tenant.name, tenant.status, tenant.billing_contact_name,
    tenant.billing_contact_email, tenant.created_at
  from public.tenants tenant
  order by tenant.created_at desc, tenant.id;
end;
$$;

create or replace function public.get_saas_tenant_status_history(target_tenant uuid)
returns table (
  id uuid,
  previous_status text,
  new_status text,
  reason text,
  actor_user_id uuid,
  occurred_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select history.id, history.previous_status, history.new_status, history.reason,
    history.actor_user_id, history.occurred_at
  from public.tenant_status_history history
  where history.tenant_id = target_tenant
  order by history.occurred_at desc, history.id;
end;
$$;

create or replace function public.transition_saas_tenant_status(
  target_tenant uuid,
  target_status text,
  transition_reason text
)
returns public.tenants
language plpgsql security definer set search_path = public
as $$
declare
  current_tenant public.tenants;
  previous_status text;
  normalized_reason text := trim(transition_reason);
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_status not in ('trial', 'active', 'suspended', 'cancelled') then
    raise exception 'Invalid tenant target status' using errcode = '22023';
  end if;
  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception 'A transition reason of at least 3 characters is required' using errcode = '22023';
  end if;

  select * into current_tenant
  from public.tenants
  where tenants.id = target_tenant
  for update;

  if not found then
    raise exception 'Tenant not found' using errcode = 'P0002';
  end if;
  if current_tenant.status = target_status then
    raise exception 'Tenant already has the requested status' using errcode = '23505';
  end if;
  if current_tenant.status = 'cancelled' then
    raise exception 'Cancelled tenants cannot transition' using errcode = '22023';
  end if;
  if current_tenant.status = 'pending' and target_status not in ('trial', 'active', 'cancelled') then
    raise exception 'Invalid transition from pending' using errcode = '22023';
  end if;
  if current_tenant.status = 'trial' and target_status not in ('active', 'suspended', 'cancelled') then
    raise exception 'Invalid transition from trial' using errcode = '22023';
  end if;
  if current_tenant.status = 'active' and target_status not in ('suspended', 'cancelled') then
    raise exception 'Invalid transition from active' using errcode = '22023';
  end if;
  if current_tenant.status = 'suspended' and target_status not in ('trial', 'active', 'cancelled') then
    raise exception 'Invalid transition from suspended' using errcode = '22023';
  end if;

  previous_status := current_tenant.status;

  update public.tenants
  set status = target_status
  where tenants.id = target_tenant
  returning * into current_tenant;

  insert into public.tenant_status_history (
    tenant_id, previous_status, new_status, reason, actor_user_id
  ) values (
    target_tenant, previous_status, target_status, normalized_reason, auth.uid()
  );

  return current_tenant;
end;
$$;

revoke all on function public.list_saas_tenants() from public;
revoke all on function public.get_saas_tenant_status_history(uuid) from public;
revoke all on function public.transition_saas_tenant_status(uuid, text, text) from public;
grant execute on function public.list_saas_tenants() to authenticated;
grant execute on function public.get_saas_tenant_status_history(uuid) to authenticated;
grant execute on function public.transition_saas_tenant_status(uuid, text, text) to authenticated;