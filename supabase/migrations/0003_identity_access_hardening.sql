-- Stage 2: ensure account status is part of every tenant authorization decision.

create or replace function public.current_tenant_ids()
returns uuid[] language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(membership.tenant_id), '{}'::uuid[])
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  where membership.user_id = auth.uid()
    and membership.status = 'active'
    and tenant.status in ('trial', 'active');
$$;

revoke all on function public.current_tenant_ids() from public;
grant execute on function public.current_tenant_ids() to authenticated;

create or replace function public.current_membership_role(target_tenant uuid)
returns text language sql stable security definer set search_path = public
as $$
  select membership.role
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  where membership.tenant_id = target_tenant
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and tenant.status in ('trial', 'active')
  limit 1;
$$;

revoke all on function public.current_membership_role(uuid) from public;
grant execute on function public.current_membership_role(uuid) to authenticated;