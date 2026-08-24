-- Stage 5: atomic, idempotent membership payment and adjustment recording.

create or replace function public.record_membership_payment(
  target_tenant uuid,
  target_membership uuid,
  target_amount numeric,
  target_currency text,
  target_paid_at timestamptz,
  target_reference text,
  target_actor_membership uuid,
  target_operation_id uuid,
  target_adjustments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  selected_membership public.student_memberships;
  existing_payment_id uuid;
  created_payment_id uuid;
  adjustment jsonb;
begin
  if target_actor_membership <> public.current_membership_id(target_tenant) then
    raise exception 'actor membership does not match current user' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_tenant::text || ':' || target_operation_id::text, 0)
  );
  select payment.id into existing_payment_id
  from public.student_membership_payments payment
  where payment.tenant_id = target_tenant
    and payment.operation_id = target_operation_id;
  if found then return existing_payment_id; end if;

  if target_amount <= 0 then
    raise exception 'payment amount must be positive' using errcode = '23514';
  end if;
  if jsonb_typeof(target_adjustments) <> 'array' then
    raise exception 'adjustments must be an array' using errcode = '22023';
  end if;

  select * into selected_membership
  from public.student_memberships membership
  where membership.tenant_id = target_tenant
    and membership.id = target_membership
  for share;
  if not found then
    raise exception 'student membership not found' using errcode = 'P0002';
  end if;
  if selected_membership.currency <> target_currency then
    raise exception 'payment currency does not match membership currency'
      using errcode = '23514';
  end if;

  insert into public.student_membership_payments (
    tenant_id, membership_id, amount, currency, status,
    paid_at, reference, operation_id
  ) values (
    target_tenant, target_membership, target_amount, target_currency, 'paid',
    target_paid_at, nullif(trim(target_reference), ''), target_operation_id
  ) returning id into created_payment_id;

  for adjustment in select value from jsonb_array_elements(target_adjustments)
  loop
    if adjustment->>'kind' not in ('discount', 'credit', 'tax')
      or coalesce((adjustment->>'amount')::numeric, 0) <= 0
      or length(trim(coalesce(adjustment->>'reason', ''))) = 0 then
      raise exception 'invalid financial adjustment' using errcode = '23514';
    end if;
    insert into public.student_membership_adjustments (
      tenant_id, membership_id, payment_id, kind, amount, currency,
      effective_on, reason, created_by_membership_id
    ) values (
      target_tenant, target_membership, created_payment_id,
      adjustment->>'kind', (adjustment->>'amount')::numeric, target_currency,
      target_paid_at::date, trim(adjustment->>'reason'), target_actor_membership
    );
  end loop;

  insert into public.instructor_financial_events (
    tenant_id, entity_type, entity_id, event_type, amount, currency,
    actor_membership_id, operation_id, occurred_at, metadata
  ) values (
    target_tenant, 'payment', created_payment_id, 'payment_recorded',
    target_amount, target_currency, target_actor_membership,
    target_operation_id, target_paid_at,
    jsonb_build_object(
      'membership_id', target_membership,
      'reference', nullif(trim(target_reference), ''),
      'adjustments', target_adjustments
    )
  );

  return created_payment_id;
end;
$$;

revoke all on function public.record_membership_payment(
  uuid, uuid, numeric, text, timestamptz, text, uuid, uuid, jsonb
) from public;
grant execute on function public.record_membership_payment(
  uuid, uuid, numeric, text, timestamptz, text, uuid, uuid, jsonb
) to authenticated;