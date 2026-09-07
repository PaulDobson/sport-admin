-- Stage 10: derive collection and renewal notices from membership balances.

create or replace function public.membership_outstanding_balances(
  target_tenant uuid default null
)
returns table (
  tenant_id uuid,
  membership_id uuid,
  student_id uuid,
  status text,
  currency text,
  next_billing_date date,
  expires_at date,
  expiration_grace_days integer,
  balance numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    membership.tenant_id,
    membership.id,
    membership.student_id,
    membership.status,
    membership.currency,
    membership.next_billing_date,
    membership.expires_at,
    plan.expiration_grace_days,
    membership.agreed_price
      + coalesce((
        select sum(
          case when adjustment.kind = 'tax' then adjustment.amount else -adjustment.amount end
        )
        from public.student_membership_adjustments adjustment
        where adjustment.tenant_id = membership.tenant_id
          and adjustment.membership_id = membership.id
      ), 0)
      - coalesce((
        select sum(payment.amount)
        from public.student_membership_payments payment
        where payment.tenant_id = membership.tenant_id
          and payment.membership_id = membership.id
          and payment.status = 'paid'
      ), 0) as balance
  from public.student_memberships membership
  join public.membership_plans plan
    on plan.tenant_id = membership.tenant_id
   and plan.id = membership.plan_id
  where membership.status in ('active', 'past_due', 'expired')
    and (target_tenant is null or membership.tenant_id = target_tenant);
$$;

revoke all on function public.membership_outstanding_balances(uuid) from public;
grant execute on function public.membership_outstanding_balances(uuid) to service_role;

-- Emits one internal notice per membership, notice type and reference period.
create or replace function public.evaluate_membership_collection_notices(
  reference_date date default current_date,
  renewal_window_days integer default 7,
  target_tenant uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  account record;
  student_name text;
  event_type text;
  severity text;
  title text;
  due_on date;
  reference_period text;
  emitted integer := 0;
begin
  if renewal_window_days < 0 then
    raise exception 'renewal window must not be negative' using errcode = '22023';
  end if;
  reference_period := to_char(reference_date, 'YYYY-MM');

  for account in
    select * from public.membership_outstanding_balances(target_tenant)
  loop
    if account.balance > 0
      and reference_date > account.next_billing_date + account.expiration_grace_days
    then
      event_type := 'finance.collection_due';
      severity := 'warning';
      title := 'Cobro pendiente';
      due_on := account.next_billing_date;
    elsif account.balance <= 0
      and account.status = 'active'
      and account.next_billing_date between reference_date
        and reference_date + renewal_window_days
    then
      event_type := 'finance.renewal_due';
      severity := 'info';
      title := 'Renovación próxima';
      due_on := account.next_billing_date;
    else
      continue;
    end if;

    select full_name into student_name
    from public.students
    where tenant_id = account.tenant_id
      and id = account.student_id;

    perform public.create_routed_activity_event(
      account.tenant_id,
      public.activity_operation_id(
        concat_ws(':', 'finance_notice', account.membership_id, event_type, reference_period)
      ),
      event_type,
      severity,
      'finance',
      'student_membership',
      account.membership_id,
      title,
      coalesce(student_name, 'Alumno') || ' · ' || to_char(due_on, 'DD-MM-YYYY'),
      jsonb_build_object(
        'student_id', account.student_id,
        'membership_id', account.membership_id,
        'balance', account.balance,
        'currency', account.currency,
        'due_on', due_on,
        'status', account.status
      ),
      now(),
      account.student_id,
      null,
      true
    );
    emitted := emitted + 1;
  end loop;

  return emitted;
end;
$$;

revoke all on function public.evaluate_membership_collection_notices(
  date, integer, uuid
) from public;
grant execute on function public.evaluate_membership_collection_notices(
  date, integer, uuid
) to service_role;
