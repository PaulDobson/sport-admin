begin;

-- Permite a un administrador de plataforma terminar el período de prueba de
-- una suscripción antes de su vencimiento natural, adelantando el límite del
-- período actual para que el scheduler procese la transición trial → active.
--
-- Si el período de prueba arrancó hoy, el límite se fija a mañana
-- (mínimo requerido por saas_subscriptions_exclusive_period_check:
--   current_period_end_exclusive > current_period_starts_on).
-- En cualquier otro caso se fija a hoy, quedando inmediatamente vencido
-- para el scheduler.
--
-- Restricciones:
--   - La suscripción debe estar en estado 'trial'.
--   - El período de prueba aún no debe haber vencido.
--   - Solo un administrador de plataforma puede ejecutar esta función.
create or replace function public.end_saas_trial(
  target_tenant uuid,
  operation_id  uuid,
  change_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription     public.saas_subscriptions;
  business_today   date := (now() at time zone 'America/Santiago')::date;
  new_period_end   date;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  if change_reason is null or length(trim(change_reason)) < 3 then
    raise exception 'A reason of at least 3 characters is required' using errcode = '22023';
  end if;

  select * into subscription
  from public.saas_subscriptions s
  where s.tenant_id = target_tenant
    and s.status = 'trial'
  for update skip locked;

  if not found then
    raise exception 'No trial subscription found for this tenant' using errcode = 'P0002';
  end if;

  if subscription.current_period_end_exclusive <= business_today then
    raise exception 'Trial period has already ended; run the renewal processor instead' using errcode = '22023';
  end if;

  -- El constraint exige current_period_end_exclusive > current_period_starts_on.
  -- Si el período arrancó hoy, el mínimo posible es mañana; en caso contrario
  -- se fija a hoy para que el scheduler lo procese de inmediato.
  new_period_end := case
    when subscription.current_period_starts_on >= business_today
    then business_today + 1
    else business_today
  end;

  perform public.record_saas_privileged_operation(
    target_tenant,
    'saas.trial_ended',
    'Terminar período de prueba anticipadamente',
    'succeeded'
  );

  update public.saas_subscriptions
  set
    current_period_end_exclusive = new_period_end,
    current_period_ends_on       = new_period_end - 1,
    next_billing_date            = new_period_end,
    updated_at                   = now()
  where id = subscription.id;

  return jsonb_build_object(
    'tenant_id',           target_tenant,
    'subscription_id',     subscription.id,
    'previous_period_end', subscription.current_period_end_exclusive,
    'new_period_end',      new_period_end
  );
end;
$$;

revoke all on function public.end_saas_trial(uuid, uuid, text) from public, anon;
grant execute on function public.end_saas_trial(uuid, uuid, text) to authenticated;

commit;
