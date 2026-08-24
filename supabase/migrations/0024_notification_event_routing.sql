-- Stage 8: generate and route tenant activity events from domain transitions.

create or replace function public.activity_operation_id(operation_key text)
returns uuid
language sql
immutable
strict
set search_path = public
as $$
  select md5(operation_key)::uuid;
$$;

create or replace function public.create_routed_activity_event(
  target_tenant uuid,
  target_operation uuid,
  target_event_type text,
  target_severity text,
  target_origin text,
  target_entity_type text,
  target_entity uuid,
  target_title text,
  target_message text,
  target_metadata jsonb,
  target_occurred_at timestamptz,
  target_student uuid default null,
  target_session uuid default null,
  include_scoped_instructors boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event uuid;
  recipient record;
  created_notification uuid;
  delivery_channel text;
begin
  if target_tenant is null
    or target_operation is null
    or target_event_type is null
    or target_severity not in ('info', 'warning', 'critical')
    or target_origin not in ('operations', 'finance', 'health', 'saas')
    or target_entity_type is null
    or target_entity is null
    or nullif(trim(target_title), '') is null
    or nullif(trim(target_message), '') is null
    or jsonb_typeof(target_metadata) <> 'object'
  then
    raise exception 'invalid routed activity event' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_tenant::text || ':' || target_operation::text, 0)
  );

  select event.id into created_event
  from public.activity_events event
  where event.tenant_id = target_tenant
    and event.operation_id = target_operation;

  if found then
    return created_event;
  end if;

  insert into public.activity_events (
    tenant_id,
    operation_id,
    event_type,
    severity,
    origin,
    entity_type,
    entity_id,
    title,
    message,
    metadata,
    occurred_at
  ) values (
    target_tenant,
    target_operation,
    target_event_type,
    target_severity,
    target_origin,
    target_entity_type,
    target_entity,
    trim(target_title),
    trim(target_message),
    target_metadata,
    coalesce(target_occurred_at, now())
  )
  returning id into created_event;

  for recipient in
    select distinct membership.user_id, membership.role
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin')
        or (
          include_scoped_instructors
          and membership.role = 'instructor'
          and (
            (
              target_session is not null
              and exists (
                select 1
                from public.class_sessions session
                where session.tenant_id = target_tenant
                  and session.id = target_session
                  and session.instructor_membership_id = membership.id
              )
            )
            or (
              target_student is not null
              and exists (
                select 1
                from public.session_enrollments enrollment
                join public.class_sessions session
                  on session.tenant_id = enrollment.tenant_id
                 and session.id = enrollment.session_id
                where enrollment.tenant_id = target_tenant
                  and enrollment.student_id = target_student
                  and enrollment.status = 'confirmed'
                  and session.status = 'scheduled'
                  and session.starts_at >= now()
                  and session.instructor_membership_id = membership.id
              )
            )
          )
        )
      )
  loop
    insert into public.activity_notifications (
      tenant_id,
      event_id,
      recipient_user_id,
      recipient_role
    ) values (
      target_tenant,
      created_event,
      recipient.user_id,
      recipient.role
    )
    on conflict (tenant_id, event_id, recipient_user_id) do nothing
    returning id into created_notification;

    if created_notification is null then
      select notification.id into created_notification
      from public.activity_notifications notification
      where notification.tenant_id = target_tenant
        and notification.event_id = created_event
        and notification.recipient_user_id = recipient.user_id;
    end if;

    for delivery_channel in
      select 'internal'::text
      union
      select preference.channel
      from public.notification_preferences preference
      where preference.tenant_id = target_tenant
        and preference.user_id = recipient.user_id
        and preference.event_type = target_event_type
        and preference.channel in ('email', 'push')
        and preference.enabled
    loop
      insert into public.notification_deliveries (
        tenant_id,
        activity_notification_id,
        channel,
        next_attempt_at
      ) values (
        target_tenant,
        created_notification,
        delivery_channel,
        now()
      )
      on conflict (tenant_id, activity_notification_id, channel) do nothing;
    end loop;
  end loop;

  return created_event;
end;
$$;

revoke all on function public.activity_operation_id(text) from public;
revoke all on function public.create_routed_activity_event(
  uuid, uuid, text, text, text, text, uuid, text, text, jsonb,
  timestamptz, uuid, uuid, boolean
) from public;

create or replace function public.notify_student_membership_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_type text;
  target_title text;
begin
  if new.status is not distinct from old.status
    or new.status not in ('expired', 'past_due')
  then
    return new;
  end if;

  target_event_type := case new.status
    when 'expired' then 'membership.expired'
    else 'membership.past_due'
  end;
  target_title := case new.status
    when 'expired' then 'Membresía vencida'
    else 'Membresía en mora'
  end;

  perform public.create_routed_activity_event(
    new.tenant_id,
    public.activity_operation_id(
      concat_ws(':', 'student_membership', new.id, new.status, new.updated_at)
    ),
    target_event_type,
    'warning',
    'finance',
    'student_membership',
    new.id,
    target_title,
    'Revisa el estado de la membresía del alumno.',
    jsonb_build_object(
      'student_id', new.student_id,
      'status', new.status,
      'expires_at', new.expires_at,
      'next_billing_date', new.next_billing_date
    ),
    new.updated_at,
    new.student_id,
    null,
    true
  );

  return new;
end;
$$;

create or replace function public.notify_absent_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'absent'
    or (tg_op = 'UPDATE' and new.status is not distinct from old.status)
  then
    return new;
  end if;

  perform public.create_routed_activity_event(
    new.tenant_id,
    coalesce(
      new.operation_id,
      public.activity_operation_id(concat_ws(':', 'attendance', new.id, new.status))
    ),
    'attendance.absent',
    'info',
    'operations',
    'class_session_attendance',
    new.id,
    'Ausencia registrada',
    'Se registró una ausencia en una sesión.',
    jsonb_build_object(
      'session_id', new.session_id,
      'student_id', new.student_id,
      'status', new.status
    ),
    new.recorded_at,
    new.student_id,
    new.session_id,
    true
  );

  return new;
end;
$$;

create or replace function public.notify_abandonment_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category <> 'abandonment' or new.status <> 'open' then
    return new;
  end if;

  perform public.create_routed_activity_event(
    new.tenant_id,
    public.activity_operation_id(concat_ws(':', 'student_alert', new.id)),
    'abandonment.risk',
    'warning',
    'operations',
    'student_alert',
    new.id,
    'Riesgo de abandono',
    'Un alumno requiere seguimiento de continuidad.',
    jsonb_build_object(
      'student_id', new.student_id,
      'alert_id', new.id,
      'period_start', new.period_start,
      'period_end', new.period_end
    ),
    new.created_at,
    new.student_id,
    new.class_session_id,
    true
  );

  return new;
end;
$$;

create or replace function public.notify_authorized_health_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active'
    or (
      tg_op = 'UPDATE'
      and new.status is not distinct from old.status
      and new.description is not distinct from old.description
      and new.operational_action is not distinct from old.operational_action
      and new.severity is not distinct from old.severity
      and new.starts_on is not distinct from old.starts_on
      and new.ends_on is not distinct from old.ends_on
    )
  then
    return new;
  end if;

  perform public.create_routed_activity_event(
    new.tenant_id,
    public.activity_operation_id(
      concat_ws(':', 'health_restriction', new.id, new.version, new.updated_at)
    ),
    'health.authorized',
    'critical',
    'health',
    'health_restriction',
    new.id,
    'Cambio de salud autorizado',
    'Verifica las indicaciones autorizadas antes de la próxima sesión.',
    jsonb_build_object(
      'student_id', new.student_id,
      'health_restriction_id', new.id,
      'status', new.status
    ),
    new.updated_at,
    new.student_id,
    null,
    true
  );

  return new;
end;
$$;

create or replace function public.notify_saas_charge_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_type text;
  target_severity text;
begin
  if new.status is not distinct from old.status
    or new.status not in ('succeeded', 'failed')
  then
    return new;
  end if;

  target_event_type := 'billing.charge.' || new.status;
  target_severity := case new.status when 'failed' then 'critical' else 'info' end;

  perform public.create_routed_activity_event(
    new.tenant_id,
    public.activity_operation_id(
      concat_ws(':', 'saas_charge', new.id, new.status, new.updated_at)
    ),
    target_event_type,
    target_severity,
    'saas',
    'saas_charge',
    new.id,
    case new.status when 'failed' then 'Cobro SaaS fallido' else 'Cobro SaaS confirmado' end,
    case new.status
      when 'failed' then 'Revisa el estado de facturación de la cuenta.'
      else 'El cobro de la suscripción fue confirmado.'
    end,
    jsonb_build_object(
      'invoice_id', new.invoice_id,
      'charge_id', new.id,
      'status', new.status
    ),
    new.updated_at,
    null,
    null,
    false
  );

  return new;
end;
$$;

create or replace function public.notify_saas_subscription_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status
    or new.status not in ('past_due', 'suspended')
  then
    return new;
  end if;

  perform public.create_routed_activity_event(
    new.tenant_id,
    public.activity_operation_id(
      concat_ws(':', 'saas_subscription', new.id, new.status, new.updated_at)
    ),
    'billing.subscription.' || new.status,
    case new.status when 'suspended' then 'critical' else 'warning' end,
    'saas',
    'saas_subscription',
    new.id,
    case new.status
      when 'suspended' then 'Suscripción SaaS suspendida'
      else 'Suscripción SaaS en mora'
    end,
    'Revisa el estado de la suscripción de la cuenta.',
    jsonb_build_object(
      'subscription_id', new.id,
      'status', new.status,
      'next_billing_date', new.next_billing_date
    ),
    new.updated_at,
    null,
    null,
    false
  );

  return new;
end;
$$;

revoke all on function public.notify_student_membership_status() from public;
revoke all on function public.notify_absent_attendance() from public;
revoke all on function public.notify_abandonment_alert() from public;
revoke all on function public.notify_authorized_health_change() from public;
revoke all on function public.notify_saas_charge_status() from public;
revoke all on function public.notify_saas_subscription_status() from public;

drop trigger if exists notify_student_membership_status on public.student_memberships;
create trigger notify_student_membership_status
  after update of status on public.student_memberships
  for each row execute function public.notify_student_membership_status();

drop trigger if exists notify_absent_attendance on public.class_session_attendance;
create trigger notify_absent_attendance
  after insert or update of status on public.class_session_attendance
  for each row execute function public.notify_absent_attendance();

drop trigger if exists notify_abandonment_alert on public.student_alerts;
create trigger notify_abandonment_alert
  after insert on public.student_alerts
  for each row execute function public.notify_abandonment_alert();

drop trigger if exists notify_authorized_health_change on public.health_restrictions;
create trigger notify_authorized_health_change
  after insert or update on public.health_restrictions
  for each row execute function public.notify_authorized_health_change();

drop trigger if exists notify_saas_charge_status on public.saas_charges;
create trigger notify_saas_charge_status
  after update of status on public.saas_charges
  for each row execute function public.notify_saas_charge_status();

drop trigger if exists notify_saas_subscription_status on public.saas_subscriptions;
create trigger notify_saas_subscription_status
  after update of status on public.saas_subscriptions
  for each row execute function public.notify_saas_subscription_status();
