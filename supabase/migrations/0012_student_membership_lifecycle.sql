-- Stage 5: atomic student membership lifecycle and event recording.

create unique index if not exists student_memberships_one_current_idx
  on public.student_memberships (tenant_id, student_id)
  where status in ('active', 'paused', 'past_due');

create or replace function public.membership_cycle_end(
  starts_on date,
  billing_cycle text
)
returns date
language sql
immutable
set search_path = public
as $$
  select (
    starts_on
    + case billing_cycle
        when 'monthly' then interval '1 month'
        when 'quarterly' then interval '3 months'
        when 'semiannual' then interval '6 months'
        when 'annual' then interval '1 year'
      end
    - interval '1 day'
  )::date;
$$;

create or replace function public.validate_student_membership_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'active' and new.status in ('paused', 'past_due', 'expired', 'cancelled'))
    or (old.status = 'paused' and new.status in ('active', 'cancelled'))
    or (old.status = 'past_due' and new.status in ('active', 'paused', 'expired', 'cancelled'))
    or (old.status = 'expired' and new.status in ('active', 'cancelled'))
  ) then
    raise exception 'invalid membership transition from % to %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_student_membership_transition
  on public.student_memberships;
create trigger validate_student_membership_transition
  before update of status on public.student_memberships
  for each row execute function public.validate_student_membership_transition();

create or replace function public.activate_student_membership(
  target_tenant uuid,
  target_student uuid,
  target_plan uuid,
  target_starts_on date,
  target_actor_membership uuid,
  target_operation_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  selected_plan public.membership_plans;
  created_membership public.student_memberships;
begin
  if target_actor_membership <> public.current_membership_id(target_tenant) then
    raise exception 'actor membership does not match current user' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.students student
    where student.tenant_id = target_tenant
      and student.id = target_student
      and student.status = 'active'
  ) then
    raise exception 'active student not found' using errcode = '23503';
  end if;

  select * into selected_plan
  from public.membership_plans plan
  where plan.tenant_id = target_tenant
    and plan.id = target_plan
    and plan.status = 'active'
  for share;
  if not found then
    raise exception 'active membership plan not found' using errcode = '23503';
  end if;

  insert into public.student_memberships (
    tenant_id, student_id, plan_id, starts_at, expires_at, status,
    agreed_price, currency, billing_cycle, next_billing_date
  ) values (
    target_tenant,
    target_student,
    target_plan,
    target_starts_on,
    public.membership_cycle_end(target_starts_on, selected_plan.billing_cycle),
    'active',
    selected_plan.price,
    selected_plan.currency,
    selected_plan.billing_cycle,
    public.membership_cycle_end(target_starts_on, selected_plan.billing_cycle) + 1
  ) returning * into created_membership;

  insert into public.instructor_financial_events (
    tenant_id, entity_type, entity_id, event_type, amount, currency,
    actor_membership_id, operation_id, metadata
  ) values (
    target_tenant, 'membership', created_membership.id, 'membership_activated',
    created_membership.agreed_price, created_membership.currency,
    target_actor_membership, target_operation_id,
    jsonb_build_object('plan_id', target_plan, 'starts_on', target_starts_on)
  );

  return created_membership.id;
end;
$$;

create or replace function public.transition_student_membership(
  target_tenant uuid,
  target_membership uuid,
  target_transition text,
  target_effective_on date,
  target_actor_membership uuid,
  target_operation_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_membership public.student_memberships;
  plan_grace_days integer;
  renewal_start date;
  resulting_event text;
begin
  if target_actor_membership <> public.current_membership_id(target_tenant) then
    raise exception 'actor membership does not match current user' using errcode = '42501';
  end if;

  select * into current_membership
  from public.student_memberships membership
  where membership.tenant_id = target_tenant
    and membership.id = target_membership
  for update;
  if not found then
    raise exception 'student membership not found' using errcode = 'P0002';
  end if;

  if target_transition = 'pause' then
    if current_membership.status not in ('active', 'past_due') then
      raise exception 'membership cannot be paused from status %', current_membership.status
        using errcode = '23514';
    end if;
    update public.student_memberships
    set status = 'paused', paused_at = target_effective_on::timestamptz,
      past_due_since = null
    where tenant_id = target_tenant and id = target_membership;
    resulting_event := 'membership_paused';
  elsif target_transition = 'renew' then
    if current_membership.status not in ('active', 'paused', 'past_due', 'expired') then
      raise exception 'membership cannot be renewed from status %', current_membership.status
        using errcode = '23514';
    end if;
    renewal_start := greatest(current_membership.next_billing_date, target_effective_on);
    update public.student_memberships
    set status = 'active',
      expires_at = public.membership_cycle_end(renewal_start, current_membership.billing_cycle),
      next_billing_date = public.membership_cycle_end(renewal_start, current_membership.billing_cycle) + 1,
      paused_at = null, past_due_since = null, cancelled_at = null
    where tenant_id = target_tenant and id = target_membership;
    resulting_event := 'membership_renewed';
  elsif target_transition = 'expire' then
    if current_membership.status not in ('active', 'past_due') then
      raise exception 'membership cannot expire from status %', current_membership.status
        using errcode = '23514';
    end if;
    if target_effective_on <= current_membership.expires_at then
      raise exception 'membership has not reached its expiration date'
        using errcode = '23514';
    end if;
    select plan.expiration_grace_days into plan_grace_days
    from public.membership_plans plan
    where plan.tenant_id = target_tenant and plan.id = current_membership.plan_id;
    if plan_grace_days > 0
      and target_effective_on <= current_membership.expires_at + plan_grace_days then
      update public.student_memberships
      set status = 'past_due',
        past_due_since = coalesce(past_due_since, current_membership.expires_at + 1)
      where tenant_id = target_tenant and id = target_membership;
      resulting_event := 'membership_past_due';
    else
      update public.student_memberships
      set status = 'expired', past_due_since = null
      where tenant_id = target_tenant and id = target_membership;
      resulting_event := 'membership_expired';
    end if;
  elsif target_transition = 'cancel' then
    if current_membership.status = 'cancelled' then
      raise exception 'membership is already cancelled' using errcode = '23514';
    end if;
    update public.student_memberships
    set status = 'cancelled', cancelled_at = target_effective_on::timestamptz,
      paused_at = null, past_due_since = null
    where tenant_id = target_tenant and id = target_membership;
    resulting_event := 'membership_cancelled';
  else
    raise exception 'unsupported membership transition: %', target_transition
      using errcode = '23514';
  end if;

  insert into public.instructor_financial_events (
    tenant_id, entity_type, entity_id, event_type, amount, currency,
    actor_membership_id, operation_id, occurred_at, metadata
  ) values (
    target_tenant, 'membership', target_membership, resulting_event,
    case when target_transition = 'renew' then current_membership.agreed_price end,
    case when target_transition = 'renew' then current_membership.currency end,
    target_actor_membership, target_operation_id, target_effective_on::timestamptz,
    jsonb_build_object('previous_status', current_membership.status)
  );

  return target_membership;
end;
$$;

revoke all on function public.membership_cycle_end(date, text) from public;
revoke all on function public.activate_student_membership(
  uuid, uuid, uuid, date, uuid, uuid
) from public;
revoke all on function public.transition_student_membership(
  uuid, uuid, text, date, uuid, uuid
) from public;
grant execute on function public.activate_student_membership(
  uuid, uuid, uuid, date, uuid, uuid
) to authenticated;
grant execute on function public.transition_student_membership(
  uuid, uuid, text, date, uuid, uuid
) to authenticated;
grant execute on function public.membership_cycle_end(date, text) to authenticated;