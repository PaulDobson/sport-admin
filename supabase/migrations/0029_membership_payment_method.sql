-- Stage 10: payment collection method and automatic resolution of collection notices.

alter table public.student_membership_payments
  add column if not exists method text not null default 'other';

alter table public.student_membership_payments
  drop constraint if exists student_membership_payments_method_check;
alter table public.student_membership_payments
  add constraint student_membership_payments_method_check
    check (method in ('cash', 'transfer', 'card', 'other'));

create index if not exists student_membership_payments_method_idx
  on public.student_membership_payments (tenant_id, method, paid_at desc);

-- Resolves open collection notices for a membership once its balance reaches zero.
create or replace function public.resolve_settled_collection_notices(
  target_tenant uuid,
  target_membership uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  contracted numeric;
  adjusted numeric;
  paid numeric;
  resolved_count integer;
begin
  select membership.agreed_price into contracted
  from public.student_memberships membership
  where membership.tenant_id = target_tenant
    and membership.id = target_membership;
  if contracted is null then
    return 0;
  end if;

  select contracted + coalesce(sum(
    case when adjustment.kind = 'tax' then adjustment.amount else -adjustment.amount end
  ), 0)
  into adjusted
  from public.student_membership_adjustments adjustment
  where adjustment.tenant_id = target_tenant
    and adjustment.membership_id = target_membership;

  select coalesce(sum(payment.amount), 0) into paid
  from public.student_membership_payments payment
  where payment.tenant_id = target_tenant
    and payment.membership_id = target_membership
    and payment.status = 'paid';

  if adjusted - paid > 0 then
    return 0;
  end if;

  with settled as (
    update public.activity_notifications notification
    set status = 'resolved', resolved_at = now()
    where notification.tenant_id = target_tenant
      and notification.status = 'pending'
      and notification.event_id in (
        select event.id
        from public.activity_events event
        where event.tenant_id = target_tenant
          and event.entity_type = 'student_membership'
          and event.entity_id = target_membership
          and event.event_type in ('finance.collection_due', 'finance.renewal_due')
      )
    returning 1
  )
  select count(*)::integer into resolved_count from settled;

  return resolved_count;
end;
$$;

revoke all on function public.resolve_settled_collection_notices(uuid, uuid) from public;

drop function if exists public.record_membership_payment(
  uuid, uuid, numeric, text, timestamptz, text, uuid, uuid, jsonb
);

create or replace function public.record_membership_payment(
  target_tenant uuid,
  target_membership uuid,
  target_amount numeric,
  target_currency text,
  target_paid_at timestamptz,
  target_reference text,
  target_actor_membership uuid,
  target_operation_id uuid,
  target_method text default 'other',
  target_adjustments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
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
  if coalesce(target_method, 'other') not in ('cash', 'transfer', 'card', 'other') then
    raise exception 'invalid payment method' using errcode = '23514';
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
    paid_at, reference, method, operation_id
  ) values (
    target_tenant, target_membership, target_amount, target_currency, 'paid',
    target_paid_at, nullif(trim(target_reference), ''),
    coalesce(target_method, 'other'), target_operation_id
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
      'method', coalesce(target_method, 'other'),
      'adjustments', target_adjustments
    )
  );

  perform public.resolve_settled_collection_notices(target_tenant, target_membership);

  return created_payment_id;
end;
$$;

revoke all on function public.record_membership_payment(
  uuid, uuid, numeric, text, timestamptz, text, uuid, uuid, text, jsonb
) from public;
grant execute on function public.record_membership_payment(
  uuid, uuid, numeric, text, timestamptz, text, uuid, uuid, text, jsonb
) to authenticated;
