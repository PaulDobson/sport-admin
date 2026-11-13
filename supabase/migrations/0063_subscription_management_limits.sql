begin;

-- Extiende get_saas_subscription_management para exponer los límites del plan
-- vigente (max_students, max_users) directamente en el objeto de gestión.
-- Esto elimina la necesidad de llamar a get_saas_tenant_entitlements por separado
-- en el backoffice de suscripción.
create or replace function public.get_saas_subscription_management(target_tenant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.record_saas_privileged_operation(
    target_tenant, 'saas.subscription_read', 'Consultar contrato y uso del tenant', 'succeeded'
  );
  select jsonb_build_object(
    'tenant_id', t.id,
    'tenant_name', t.name,
    'tenant_status', t.status,
    'business_date', (now() at time zone 'America/Santiago')::date,
    'active_students', (
      select count(*) from public.students s
      where s.tenant_id = t.id and s.status = 'active'
    ),
    'active_users', (
      select count(*) from public.tenant_memberships m
      where m.tenant_id = t.id and m.status = 'active'
    ),
    'max_students', (
      select lim.max_students
      from public.saas_subscriptions sub
      join public.current_saas_limits(t.id, (now() at time zone 'America/Santiago')::date) lim on true
      where sub.tenant_id = t.id
        and sub.status in ('trial', 'active', 'past_due', 'suspended')
      limit 1
    ),
    'max_users', (
      select lim.max_users
      from public.saas_subscriptions sub
      join public.current_saas_limits(t.id, (now() at time zone 'America/Santiago')::date) lim on true
      where sub.tenant_id = t.id
        and sub.status in ('trial', 'active', 'past_due', 'suspended')
      limit 1
    ),
    'scheduled_change', (
      select jsonb_build_object(
        'id', c.id,
        'plan_name', v.name,
        'price', v.price,
        'currency', v.currency,
        'effective_on', c.effective_on,
        'status', c.status,
        'reason', c.reason,
        'blocked_reason', c.blocked_reason
      )
      from public.saas_scheduled_plan_changes c
      join public.saas_plan_versions v on v.id = c.plan_version_id
      join public.saas_subscriptions s on s.id = c.subscription_id
      where c.tenant_id = t.id
        and c.status in ('scheduled', 'blocked')
        and s.status in ('trial', 'active', 'past_due', 'suspended')
      order by c.created_at desc, c.id desc
      limit 1
    ),
    'subscription', (
      select jsonb_build_object(
        'id', s.id,
        'plan_id', s.plan_id,
        'plan_version_id', s.plan_version_id,
        'status', s.status,
        'payment_status', s.payment_status,
        'starts_on', s.starts_on,
        'period_starts_on', s.current_period_starts_on,
        'period_end_exclusive', coalesce(
          s.current_period_end_exclusive,
          s.current_period_ends_on + 1
        ),
        'next_billing_date', s.next_billing_date,
        'price', s.price,
        'currency', s.currency,
        'contract_snapshot', s.contract_snapshot,
        'duration_unit', s.duration_unit,
        'duration_count', s.duration_count
      )
      from public.saas_subscriptions s
      where s.tenant_id = t.id
        and s.status in ('trial', 'active', 'past_due', 'suspended')
    )
  ) into result
  from public.tenants t
  where t.id = target_tenant;

  if result is null then
    raise exception 'Tenant not found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

commit;
