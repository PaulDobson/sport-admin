-- Stage 8: atomic notification delivery claims, retries, and completion history.

do $$
declare
  pending_check text;
begin
  select constraint_row.conname into pending_check
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.notification_deliveries'::regclass
    and constraint_row.contype = 'c'
    and pg_get_constraintdef(constraint_row.oid) like '%attempt_count < max_attempts%';
  if pending_check is not null then
    execute format(
      'alter table public.notification_deliveries drop constraint %I',
      pending_check
    );
  end if;
end;
$$;
alter table public.notification_deliveries
  add constraint notification_deliveries_pending_attempts_check
    check (status <> 'pending' or attempt_count <= max_attempts);

create or replace function public.claim_notification_delivery(
  target_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed record;
begin
  select
    delivery.id,
    delivery.tenant_id,
    delivery.channel,
    delivery.attempt_count + 1 as attempt_number,
    notification.recipient_user_id,
    event.id as event_id,
    event.event_type,
    event.entity_type,
    event.entity_id,
    event.title,
    event.message
  into claimed
  from public.notification_deliveries delivery
  join public.activity_notifications notification
    on notification.tenant_id = delivery.tenant_id
   and notification.id = delivery.activity_notification_id
  join public.activity_events event
    on event.tenant_id = notification.tenant_id
   and event.id = notification.event_id
  where delivery.status = 'pending'
    and delivery.attempt_count < delivery.max_attempts
    and coalesce(delivery.next_attempt_at, delivery.created_at) <= target_now
  order by coalesce(delivery.next_attempt_at, delivery.created_at), delivery.created_at
  for update of delivery skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.notification_deliveries
  set
    attempt_count = claimed.attempt_number,
    next_attempt_at = target_now + interval '5 minutes'
  where id = claimed.id and tenant_id = claimed.tenant_id;

  return jsonb_build_object(
    'id', claimed.id,
    'attemptNumber', claimed.attempt_number,
    'channel', claimed.channel,
    'recipientUserId', claimed.recipient_user_id,
    'eventId', claimed.event_id,
    'eventType', claimed.event_type,
    'entityType', claimed.entity_type,
    'entityId', claimed.entity_id,
    'title', claimed.title,
    'message', claimed.message
  );
end;
$$;

create or replace function public.complete_notification_delivery(
  target_delivery uuid,
  target_attempt_number integer,
  target_outcome text,
  target_provider_reference text,
  target_error_code text,
  target_retryable boolean,
  target_completed_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery public.notification_deliveries;
  existing_attempt public.notification_delivery_attempts;
  next_status text;
  retry_delay interval;
begin
  if target_outcome not in ('delivered', 'failed') then
    raise exception 'invalid notification delivery outcome' using errcode = '22023';
  end if;

  select * into existing_attempt
  from public.notification_delivery_attempts attempt
  where attempt.delivery_id = target_delivery
    and attempt.attempt_number = target_attempt_number;
  if found then
    select status into next_status
    from public.notification_deliveries
    where id = target_delivery;
    return next_status;
  end if;

  select * into delivery
  from public.notification_deliveries
  where id = target_delivery
  for update;
  if not found then
    raise exception 'notification delivery not found' using errcode = 'P0002';
  end if;
  if delivery.status <> 'pending'
    or delivery.attempt_count <> target_attempt_number
  then
    raise exception 'notification delivery claim is stale' using errcode = '40001';
  end if;

  insert into public.notification_delivery_attempts (
    tenant_id,
    delivery_id,
    attempt_number,
    status,
    provider_reference,
    error_code,
    attempted_at,
    completed_at
  ) values (
    delivery.tenant_id,
    delivery.id,
    target_attempt_number,
    target_outcome,
    target_provider_reference,
    target_error_code,
    target_completed_at,
    target_completed_at
  );

  if target_outcome = 'delivered' then
    update public.notification_deliveries
    set
      status = 'delivered',
      delivered_at = target_completed_at,
      next_attempt_at = null,
      last_error_code = null
    where id = delivery.id;
    return 'delivered';
  end if;

  if target_retryable and delivery.attempt_count < delivery.max_attempts then
    retry_delay := case delivery.attempt_count
      when 1 then interval '1 minute'
      when 2 then interval '5 minutes'
      else interval '30 minutes'
    end;
    next_status := 'pending';
    update public.notification_deliveries
    set
      status = next_status,
      next_attempt_at = target_completed_at + retry_delay,
      last_error_code = target_error_code
    where id = delivery.id;
  else
    next_status := 'failed';
    update public.notification_deliveries
    set
      status = next_status,
      next_attempt_at = null,
      last_error_code = target_error_code
    where id = delivery.id;
  end if;

  return next_status;
end;
$$;

revoke all on function public.claim_notification_delivery(timestamptz) from public;
revoke all on function public.complete_notification_delivery(
  uuid, integer, text, text, text, boolean, timestamptz
) from public;
grant execute on function public.claim_notification_delivery(timestamptz) to service_role;
grant execute on function public.complete_notification_delivery(
  uuid, integer, text, text, text, boolean, timestamptz
) to service_role;