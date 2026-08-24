-- Stage 4: configurable abandonment policies and deduplicated alerts.

create table if not exists public.abandonment_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  instructor_membership_id uuid not null,
  consecutive_absences_threshold integer not null default 3
    check (consecutive_absences_threshold between 1 and 20),
  attendance_percentage_threshold numeric(5, 2) not null default 50
    check (attendance_percentage_threshold between 0 and 100),
  lookback_days integer not null default 30 check (lookback_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, instructor_membership_id),
  foreign key (tenant_id, instructor_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete cascade
);

create index if not exists abandonment_policies_instructor_idx
  on public.abandonment_policies (tenant_id, instructor_membership_id);
create index if not exists student_alerts_abandonment_history_idx
  on public.student_alerts (tenant_id, student_id, created_at desc)
  where category = 'abandonment';

drop trigger if exists set_abandonment_policies_updated_at
  on public.abandonment_policies;
create trigger set_abandonment_policies_updated_at
  before update on public.abandonment_policies
  for each row execute function public.set_health_record_updated_at();

alter table public.abandonment_policies enable row level security;

create policy abandonment_policies_select on public.abandonment_policies for select
  using (public.can_view_instructor_scope(tenant_id, instructor_membership_id));
create policy abandonment_policies_insert on public.abandonment_policies for insert
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));
create policy abandonment_policies_update on public.abandonment_policies for update
  using (public.can_manage_instructor_scope(tenant_id, instructor_membership_id))
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));

create or replace function public.upsert_abandonment_alert(
  target_tenant uuid,
  target_student uuid,
  target_reason text,
  target_period_start date,
  target_period_end date,
  target_deduplication_key text
)
returns public.student_alerts
language plpgsql
set search_path = public
as $$
declare
  result public.student_alerts;
begin
  select * into result
  from public.student_alerts alert
  where alert.tenant_id = target_tenant
    and alert.student_id = target_student
    and alert.deduplication_key = target_deduplication_key
    and alert.status = 'open';

  if found then
    return result;
  end if;

  insert into public.student_alerts (
    tenant_id,
    student_id,
    category,
    severity,
    reason,
    operational_action,
    period_start,
    period_end,
    deduplication_key
  ) values (
    target_tenant,
    target_student,
    'abandonment',
    'yellow',
    target_reason,
    'Contactar al alumno y revisar continuidad',
    target_period_start,
    target_period_end,
    target_deduplication_key
  )
  on conflict do nothing
  returning * into result;

  if found then
    return result;
  end if;

  select * into result
  from public.student_alerts alert
  where alert.tenant_id = target_tenant
    and alert.student_id = target_student
    and alert.deduplication_key = target_deduplication_key
    and alert.status = 'open';
  return result;
end;
$$;

revoke all on function public.upsert_abandonment_alert(
  uuid, uuid, text, date, date, text
) from public;
grant execute on function public.upsert_abandonment_alert(
  uuid, uuid, text, date, date, text
) to authenticated;

  create or replace function public.evaluate_abandonment_after_attendance()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    target_instructor uuid;
    absence_threshold integer := 3;
    percentage_threshold numeric := 50;
    target_lookback_days integer := 30;
    recent_absences integer;
    eligible_sessions integer;
    attended_sessions integer;
    risk_period_start date;
    risk_period_end date := new.recorded_at::date;
    risk_key text;
  begin
    select session.instructor_membership_id into target_instructor
    from public.class_sessions session
    where session.tenant_id = new.tenant_id and session.id = new.session_id;

    select
      policy.consecutive_absences_threshold,
      policy.attendance_percentage_threshold,
      policy.lookback_days
    into absence_threshold, percentage_threshold, target_lookback_days
    from public.abandonment_policies policy
    where policy.tenant_id = new.tenant_id
      and policy.instructor_membership_id = target_instructor;

    absence_threshold := coalesce(absence_threshold, 3);
    percentage_threshold := coalesce(percentage_threshold, 50);
    target_lookback_days := coalesce(target_lookback_days, 30);

    select count(*), min(recent.recorded_at)::date
    into recent_absences, risk_period_start
    from (
      select attendance.status, attendance.recorded_at
      from public.class_session_attendance attendance
      join public.class_sessions session
        on session.tenant_id = attendance.tenant_id
       and session.id = attendance.session_id
      where attendance.tenant_id = new.tenant_id
        and attendance.student_id = new.student_id
        and session.instructor_membership_id = target_instructor
        and attendance.recorded_at <= new.recorded_at
      order by attendance.recorded_at desc
      limit absence_threshold
    ) recent
    where recent.status = 'absent';

    if recent_absences = absence_threshold then
      risk_key := concat_ws(
        ':',
        'abandonment',
        target_instructor,
        new.student_id,
        'consecutive_absences'
      );
      perform public.upsert_abandonment_alert(
        new.tenant_id,
        new.student_id,
        recent_absences || ' ausencias consecutivas',
        risk_period_start,
        risk_period_end,
        risk_key
      );
      return new;
    end if;

    risk_period_start := risk_period_end - target_lookback_days;
    select
      count(*) filter (where attendance.status <> 'excused'),
      count(*) filter (where attendance.status in ('present', 'late'))
    into eligible_sessions, attended_sessions
    from public.class_session_attendance attendance
    join public.class_sessions session
      on session.tenant_id = attendance.tenant_id
     and session.id = attendance.session_id
    where attendance.tenant_id = new.tenant_id
      and attendance.student_id = new.student_id
      and session.instructor_membership_id = target_instructor
      and attendance.recorded_at::date between risk_period_start and risk_period_end;

    if eligible_sessions > 0
      and attended_sessions * 100.0 / eligible_sessions < percentage_threshold then
      risk_key := concat_ws(
        ':',
        'abandonment',
        target_instructor,
        new.student_id,
        'attendance_percentage'
      );
      perform public.upsert_abandonment_alert(
        new.tenant_id,
        new.student_id,
        round(attended_sessions * 100.0 / eligible_sessions) ||
          '% de asistencia en ' || target_lookback_days || ' días',
        risk_period_start,
        risk_period_end,
        risk_key
      );
    end if;

    return new;
  end;
  $$;

  revoke all on function public.evaluate_abandonment_after_attendance() from public;

  drop trigger if exists evaluate_abandonment_after_attendance
    on public.class_session_attendance;
  create trigger evaluate_abandonment_after_attendance
    after insert or update of status, recorded_at
    on public.class_session_attendance
    for each row execute function public.evaluate_abandonment_after_attendance();